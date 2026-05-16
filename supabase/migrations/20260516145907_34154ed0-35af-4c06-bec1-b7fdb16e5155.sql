
-- 1. Buckets receipts + documents -> PRIVATE
UPDATE storage.buckets SET public = false WHERE id IN ('receipts','documents');

-- Receipts policies
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their receipts" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload receipts to their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update receipts in their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete receipts in their org folder" ON storage.objects;

CREATE POLICY "Org members can view receipts" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Org members can upload receipts to their org folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Org members can update receipts in their org folder" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()))
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Org members can delete receipts in their org folder" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()));

-- Documents policies
DROP POLICY IF EXISTS "Anyone can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their organization folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their organization documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can read documents in their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload documents to their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete documents in their org folder" ON storage.objects;

CREATE POLICY "Org members can read documents in their org folder" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Org members can upload documents to their org folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()));
CREATE POLICY "Org members can delete documents in their org folder" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_roles WHERE user_id = auth.uid()));

-- 2. Data migration: URL -> path
UPDATE public.expenses SET receipt_url = split_part(receipt_url, '/storage/v1/object/public/receipts/', 2) WHERE receipt_url LIKE '%/storage/v1/object/public/receipts/%';
UPDATE public.expenses SET receipt_url = split_part(receipt_url, '/storage/v1/object/sign/receipts/', 2) WHERE receipt_url LIKE '%/storage/v1/object/sign/receipts/%';
UPDATE public.expenses SET receipt_url = split_part(receipt_url, '?', 1) WHERE receipt_url LIKE '%?%';
UPDATE public.note_attachments SET file_url = split_part(file_url, '/storage/v1/object/public/documents/', 2) WHERE file_url LIKE '%/storage/v1/object/public/documents/%';
UPDATE public.note_attachments SET file_url = split_part(file_url, '/storage/v1/object/sign/documents/', 2) WHERE file_url LIKE '%/storage/v1/object/sign/documents/%';
UPDATE public.note_attachments SET file_url = split_part(file_url, '?', 1) WHERE file_url LIKE '%?%';
UPDATE public.prospect_attachments SET file_url = split_part(file_url, '/storage/v1/object/public/documents/', 2) WHERE file_url LIKE '%/storage/v1/object/public/documents/%';
UPDATE public.prospect_attachments SET file_url = split_part(file_url, '/storage/v1/object/sign/documents/', 2) WHERE file_url LIKE '%/storage/v1/object/sign/documents/%';
UPDATE public.prospect_attachments SET file_url = split_part(file_url, '?', 1) WHERE file_url LIKE '%?%';

-- 3. Drop unused TOTP columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS totp_secret;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS totp_enabled;

-- 4. Move pg_net to extensions schema (drop + recreate)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role, postgres;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- 5. realtime.messages : deny-all (app uses only postgres_changes)
DROP POLICY IF EXISTS "Deny all broadcast subscriptions" ON realtime.messages;
CREATE POLICY "Deny all broadcast subscriptions" ON realtime.messages
FOR ALL TO authenticated USING (false) WITH CHECK (false);
