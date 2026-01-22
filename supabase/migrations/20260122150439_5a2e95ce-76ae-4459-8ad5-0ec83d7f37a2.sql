-- 1.1 Création du bucket "documents" (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- 1.2 Politique RLS pour INSERT (upload)
-- Seuls les utilisateurs authentifiés de l'organisation peuvent uploader
CREATE POLICY "Users can upload documents to their organization folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (public.get_user_organization_id())::text
);

-- 1.3 Politique RLS pour SELECT (lecture publique)
-- Lecture publique car le bucket est public (URLs avec hash unique)
CREATE POLICY "Anyone can read documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- 1.4 Politique RLS pour DELETE
-- Seuls les utilisateurs de l'organisation peuvent supprimer leurs fichiers
CREATE POLICY "Users can delete their organization documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = (public.get_user_organization_id())::text
);