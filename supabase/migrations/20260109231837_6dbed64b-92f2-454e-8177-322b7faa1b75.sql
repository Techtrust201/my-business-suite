-- Add logo_url column to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for logos bucket
CREATE POLICY "Logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Users can upload logos for their organization"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (SELECT id::text FROM organizations WHERE id = get_user_organization_id())
);

CREATE POLICY "Users can update logos for their organization"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (SELECT id::text FROM organizations WHERE id = get_user_organization_id())
);

CREATE POLICY "Users can delete logos for their organization"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (SELECT id::text FROM organizations WHERE id = get_user_organization_id())
);