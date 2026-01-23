-- Create reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    remind_at timestamp with time zone NOT NULL,
    is_completed boolean DEFAULT FALSE NOT NULL,
    completed_at timestamp with time zone,
    -- Optional linked entities
    prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
    contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
    quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
    invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
    -- Recurrence settings
    recurrence text, -- 'none', 'daily', 'weekly', 'monthly'
    recurrence_end_date date,
    -- Metadata
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_organization_id ON public.reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON public.reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_prospect_id ON public.reminders(prospect_id);
CREATE INDEX IF NOT EXISTS idx_reminders_upcoming ON public.reminders(user_id, remind_at) 
    WHERE is_completed = FALSE;

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own reminders or org reminders." ON public.reminders
    FOR SELECT USING (
        user_id = auth.uid() OR 
        organization_id IN (SELECT public.get_user_organizations())
    );

CREATE POLICY "Users can insert reminders in their org." ON public.reminders
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT public.get_user_organizations())
    );

CREATE POLICY "Users can update their own reminders." ON public.reminders
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reminders." ON public.reminders
    FOR DELETE USING (user_id = auth.uid());

-- Enable realtime for reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;

-- Create a function to get upcoming reminders and trigger notifications
CREATE OR REPLACE FUNCTION public.get_due_reminders(_user_id uuid)
RETURNS SETOF public.reminders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.reminders
    WHERE user_id = _user_id
    AND is_completed = FALSE
    AND remind_at <= now() + interval '1 hour'
    ORDER BY remind_at ASC;
END;
$$;

-- Create a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_reminder_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_reminder_timestamp();
