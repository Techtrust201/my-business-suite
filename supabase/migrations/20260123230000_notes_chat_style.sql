-- Enhanced notes for chat-style with replies and mentions

-- Add parent_note_id for threaded replies
ALTER TABLE public.prospect_notes ADD COLUMN IF NOT EXISTS parent_note_id uuid REFERENCES public.prospect_notes(id) ON DELETE CASCADE;

-- Add mentions array to track mentioned users
ALTER TABLE public.prospect_notes ADD COLUMN IF NOT EXISTS mentions uuid[] DEFAULT '{}';

-- Add is_edited flag
ALTER TABLE public.prospect_notes ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT FALSE;
ALTER TABLE public.prospect_notes ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- Create index for faster reply queries
CREATE INDEX IF NOT EXISTS idx_prospect_notes_parent_id ON public.prospect_notes(parent_note_id);
CREATE INDEX IF NOT EXISTS idx_prospect_notes_mentions ON public.prospect_notes USING GIN (mentions);

-- Create note_attachments table if not exists
CREATE TABLE IF NOT EXISTS public.note_attachments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id uuid NOT NULL REFERENCES public.prospect_notes(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size bigint,
    file_type text,
    uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON public.note_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_org_id ON public.note_attachments(organization_id);

-- Enable RLS
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Organizations can view their note attachments." ON public.note_attachments
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Organization members can insert note attachments." ON public.note_attachments
    FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Organization members can delete their note attachments." ON public.note_attachments
    FOR DELETE USING (organization_id IN (SELECT public.get_user_organizations()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_attachments;

-- Function to extract mentions from note content
CREATE OR REPLACE FUNCTION public.extract_mentions(content text)
RETURNS uuid[]
LANGUAGE plpgsql
AS $$
DECLARE
    mentions uuid[] := '{}';
    mention_pattern text := '@\[([^\]]+)\]\(([0-9a-f-]+)\)';
    match_record record;
BEGIN
    -- Find all @[Name](uuid) patterns and extract UUIDs
    FOR match_record IN
        SELECT (regexp_matches(content, mention_pattern, 'g'))[2] as user_id
    LOOP
        BEGIN
            mentions := array_append(mentions, match_record.user_id::uuid);
        EXCEPTION WHEN invalid_text_representation THEN
            -- Skip invalid UUIDs
            CONTINUE;
        END;
    END LOOP;
    
    RETURN mentions;
END;
$$;

-- Trigger to automatically extract mentions on insert/update
CREATE OR REPLACE FUNCTION public.auto_extract_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.mentions := public.extract_mentions(NEW.content);
    RETURN NEW;
END;
$$;

CREATE TRIGGER extract_mentions_on_note
    BEFORE INSERT OR UPDATE ON public.prospect_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_extract_mentions();

-- Function to notify mentioned users
CREATE OR REPLACE FUNCTION public.notify_mentioned_users()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    mentioned_user_id uuid;
    prospect_name text;
BEGIN
    -- Only notify on INSERT or if mentions were added
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.mentions != OLD.mentions) THEN
        -- Get prospect name for the notification
        SELECT company_name INTO prospect_name
        FROM public.prospects
        WHERE id = NEW.prospect_id;
        
        -- Create notification for each mentioned user
        FOREACH mentioned_user_id IN ARRAY NEW.mentions
        LOOP
            -- Don't notify the author
            IF mentioned_user_id != NEW.created_by THEN
                INSERT INTO public.notifications (
                    recipient_id,
                    organization_id,
                    type,
                    title,
                    message,
                    link,
                    is_read
                ) VALUES (
                    mentioned_user_id,
                    NEW.organization_id,
                    'mention',
                    'Vous avez été mentionné',
                    'Vous avez été mentionné dans une note sur le prospect "' || COALESCE(prospect_name, 'Inconnu') || '"',
                    '/crm?prospect=' || NEW.prospect_id,
                    FALSE
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER notify_mentions_on_note
    AFTER INSERT OR UPDATE ON public.prospect_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_mentioned_users();
