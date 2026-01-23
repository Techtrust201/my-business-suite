-- Create auto_reminder_rules table for configuring automatic reminders based on prospect status
CREATE TABLE IF NOT EXISTS public.auto_reminder_rules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    -- Trigger conditions
    trigger_status_id uuid REFERENCES public.prospect_statuses(id) ON DELETE CASCADE,
    days_in_status integer NOT NULL DEFAULT 7, -- Trigger after X days in this status
    -- What to do
    action_type text NOT NULL CHECK (action_type IN ('reminder', 'notification', 'status_change')),
    -- For reminder/notification
    reminder_title text,
    reminder_message text,
    -- For status change
    new_status_id uuid REFERENCES public.prospect_statuses(id) ON DELETE SET NULL,
    -- Who gets notified
    notify_created_by boolean DEFAULT TRUE,
    notify_assigned_to boolean DEFAULT TRUE,
    notify_role_id uuid REFERENCES public.organization_roles(id) ON DELETE SET NULL,
    -- Priority and active state
    priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_active boolean DEFAULT TRUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auto_reminder_rules_org_id ON public.auto_reminder_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_auto_reminder_rules_status_id ON public.auto_reminder_rules(trigger_status_id);
CREATE INDEX IF NOT EXISTS idx_auto_reminder_rules_active ON public.auto_reminder_rules(is_active);

-- Enable RLS
ALTER TABLE public.auto_reminder_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Organizations can view their auto reminder rules." ON public.auto_reminder_rules
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Organization admins can manage auto reminder rules." ON public.auto_reminder_rules
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations_with_role('admin')))
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations_with_role('admin')));

-- Table for tracking which reminders have been triggered to avoid duplicates
CREATE TABLE IF NOT EXISTS public.auto_reminder_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id uuid NOT NULL REFERENCES public.auto_reminder_rules(id) ON DELETE CASCADE,
    prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
    triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    reminder_id uuid REFERENCES public.reminders(id) ON DELETE SET NULL,
    notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
    UNIQUE (rule_id, prospect_id) -- One trigger per rule per prospect
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auto_reminder_logs_rule_id ON public.auto_reminder_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_auto_reminder_logs_prospect_id ON public.auto_reminder_logs(prospect_id);

-- Enable RLS
ALTER TABLE public.auto_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their auto reminder logs." ON public.auto_reminder_logs
    FOR SELECT USING (
        rule_id IN (SELECT id FROM public.auto_reminder_rules WHERE organization_id IN (SELECT public.get_user_organizations()))
    );

CREATE POLICY "System can insert auto reminder logs." ON public.auto_reminder_logs
    FOR INSERT WITH CHECK (
        rule_id IN (SELECT id FROM public.auto_reminder_rules WHERE organization_id IN (SELECT public.get_user_organizations()))
    );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_reminder_rules;

-- Trigger for updated_at
CREATE TRIGGER update_auto_reminder_rules_updated_at
    BEFORE UPDATE ON public.auto_reminder_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check and create auto-reminders (can be called by cron job or edge function)
CREATE OR REPLACE FUNCTION public.process_auto_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rule RECORD;
    prospect RECORD;
    user_to_notify uuid;
BEGIN
    -- Loop through all active rules
    FOR rule IN 
        SELECT r.*, s.name as status_name
        FROM public.auto_reminder_rules r
        LEFT JOIN public.prospect_statuses s ON r.trigger_status_id = s.id
        WHERE r.is_active = TRUE
    LOOP
        -- Find prospects that match this rule
        FOR prospect IN
            SELECT p.*, 
                   EXTRACT(EPOCH FROM (now() - COALESCE(p.status_changed_at, p.created_at))) / 86400 as days_in_status
            FROM public.prospects p
            WHERE p.organization_id = rule.organization_id
              AND (rule.trigger_status_id IS NULL OR p.status_id = rule.trigger_status_id)
              AND EXTRACT(EPOCH FROM (now() - COALESCE(p.status_changed_at, p.created_at))) / 86400 >= rule.days_in_status
              AND p.converted_at IS NULL -- Not converted yet
              AND NOT EXISTS (
                  SELECT 1 FROM public.auto_reminder_logs l
                  WHERE l.rule_id = rule.id AND l.prospect_id = p.id
              )
        LOOP
            -- Determine who to notify
            user_to_notify := NULL;
            IF rule.notify_assigned_to AND prospect.assigned_to_user_id IS NOT NULL THEN
                user_to_notify := prospect.assigned_to_user_id;
            ELSIF rule.notify_created_by AND prospect.created_by IS NOT NULL THEN
                user_to_notify := prospect.created_by;
            END IF;
            
            IF user_to_notify IS NOT NULL THEN
                IF rule.action_type = 'reminder' THEN
                    -- Create a reminder
                    INSERT INTO public.reminders (
                        organization_id,
                        user_id,
                        related_to_id,
                        related_to_type,
                        title,
                        description,
                        remind_at,
                        is_completed
                    ) VALUES (
                        rule.organization_id,
                        user_to_notify,
                        prospect.id,
                        'prospect',
                        COALESCE(rule.reminder_title, 'Relance prospect: ' || prospect.company_name),
                        COALESCE(rule.reminder_message, 'Ce prospect est en statut "' || rule.status_name || '" depuis ' || rule.days_in_status || ' jours.'),
                        now(),
                        FALSE
                    );
                    
                    -- Log that we've triggered this rule
                    INSERT INTO public.auto_reminder_logs (rule_id, prospect_id)
                    VALUES (rule.id, prospect.id);
                    
                ELSIF rule.action_type = 'notification' THEN
                    -- Create a notification
                    INSERT INTO public.notifications (
                        recipient_id,
                        organization_id,
                        type,
                        title,
                        message,
                        link,
                        is_read
                    ) VALUES (
                        user_to_notify,
                        rule.organization_id,
                        'auto_reminder',
                        COALESCE(rule.reminder_title, 'Relance automatique'),
                        COALESCE(rule.reminder_message, 'Le prospect "' || prospect.company_name || '" est en statut "' || rule.status_name || '" depuis ' || rule.days_in_status || ' jours.'),
                        '/crm?prospect=' || prospect.id,
                        FALSE
                    );
                    
                    -- Log that we've triggered this rule
                    INSERT INTO public.auto_reminder_logs (rule_id, prospect_id)
                    VALUES (rule.id, prospect.id);
                END IF;
            END IF;
            
            -- Handle status change action
            IF rule.action_type = 'status_change' AND rule.new_status_id IS NOT NULL THEN
                UPDATE public.prospects
                SET status_id = rule.new_status_id,
                    status_changed_at = now()
                WHERE id = prospect.id;
                
                -- Log that we've triggered this rule
                INSERT INTO public.auto_reminder_logs (rule_id, prospect_id)
                VALUES (rule.id, prospect.id);
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- Add status_changed_at to prospects if not exists
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone;
