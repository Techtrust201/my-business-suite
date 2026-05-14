-- =============================================
-- N6 + #3 (scan) — Buckets receipts et documents en privé + RLS scopee.
-- =============================================
-- Avant : `receipts` et `documents` etaient publics, et la policy SELECT
-- "Anyone can view" / "Anyone can read" laissait fuiter tous les
-- justificatifs et PDF de l'app a quiconque possede une URL.
--
-- Apres :
--   - buckets prives (public = false)
--   - SELECT scope par organisation via le prefixe de chemin
--   - INSERT/UPDATE/DELETE alignes sur le pattern de `logos`
--   - les frontends doivent utiliser createSignedUrl (fait dans la phase
--     applicative suivante)
-- `logos` reste public (image utilisee dans des PDF / emails non
-- authentifies → non sensible).
-- =============================================

UPDATE storage.buckets
SET public = false
WHERE id IN ('receipts', 'documents');

-- ---------- receipts ----------
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their receipts" ON storage.objects;

CREATE POLICY "Org members can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can upload receipts to their org folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can update receipts in their org folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can delete receipts in their org folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

-- ---------- documents ----------
DROP POLICY IF EXISTS "Anyone can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their organization folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their organization documents" ON storage.objects;

CREATE POLICY "Org members can read documents in their org folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can upload documents to their org folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can delete documents in their org folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
  )
);
