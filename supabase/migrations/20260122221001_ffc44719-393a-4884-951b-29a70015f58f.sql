-- Add granular CRM permissions to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS can_manage_prospects BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_send_emails BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS can_view_dashboard BOOLEAN NOT NULL DEFAULT true;

-- Enable realtime on prospects table for live map updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospects;

-- Enable realtime on prospect_visits for activity feed updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospect_visits;