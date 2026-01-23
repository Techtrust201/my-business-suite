-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'prospect_assigned', 'quote_status', 'invoice_paid', 'reminder', 'mention', etc.
    title text NOT NULL,
    message text,
    link text, -- Optional link to navigate to
    data jsonb DEFAULT '{}'::jsonb, -- Additional context data
    is_read boolean DEFAULT FALSE NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see their own notifications
CREATE POLICY "Users can view their own notifications." ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications." ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications." ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- System/Admin can insert notifications (using service role or authenticated users with proper checks)
CREATE POLICY "Authenticated users can insert notifications for their org." ON public.notifications
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT public.get_user_organizations())
    );

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create a function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
    _organization_id uuid,
    _user_id uuid,
    _type text,
    _title text,
    _message text DEFAULT NULL,
    _link text DEFAULT NULL,
    _data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id uuid;
BEGIN
    INSERT INTO public.notifications (organization_id, user_id, type, title, message, link, data)
    VALUES (_organization_id, _user_id, _type, _title, _message, _link, _data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

-- Create a function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(_notification_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = now()
    WHERE id = ANY(_notification_ids)
    AND user_id = auth.uid();
END;
$$;

-- Create a function to mark all notifications as read for current user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = now()
    WHERE user_id = auth.uid()
    AND is_read = FALSE;
END;
$$;
