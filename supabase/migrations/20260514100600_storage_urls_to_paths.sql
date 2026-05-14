-- =============================================
-- Phase 2 — Migration des donnees existantes : URL publique -> path
-- =============================================
-- Apres bascule des buckets `receipts` et `documents` en prives, les
-- colonnes qui contenaient l'URL publique cessent de fonctionner.
-- On extrait le chemin interne au bucket et on remplace.
--
-- L'helper extractStoragePath cote frontend gere les deux formes pendant
-- la transition (URL ancienne / path nouveau), donc cette migration peut
-- etre executee a tout moment sans casser l'app.
-- =============================================

-- expenses.receipt_url
UPDATE public.expenses
SET receipt_url = split_part(receipt_url, '/storage/v1/object/public/receipts/', 2)
WHERE receipt_url LIKE '%/storage/v1/object/public/receipts/%';

UPDATE public.expenses
SET receipt_url = split_part(receipt_url, '/storage/v1/object/sign/receipts/', 2)
WHERE receipt_url LIKE '%/storage/v1/object/sign/receipts/%';

-- Nettoyer les query strings restants (URLs signees expirees).
UPDATE public.expenses
SET receipt_url = split_part(receipt_url, '?', 1)
WHERE receipt_url LIKE '%?%';

-- note_attachments.file_url
UPDATE public.note_attachments
SET file_url = split_part(file_url, '/storage/v1/object/public/documents/', 2)
WHERE file_url LIKE '%/storage/v1/object/public/documents/%';

UPDATE public.note_attachments
SET file_url = split_part(file_url, '/storage/v1/object/sign/documents/', 2)
WHERE file_url LIKE '%/storage/v1/object/sign/documents/%';

UPDATE public.note_attachments
SET file_url = split_part(file_url, '?', 1)
WHERE file_url LIKE '%?%';

-- prospect_attachments.file_url
UPDATE public.prospect_attachments
SET file_url = split_part(file_url, '/storage/v1/object/public/documents/', 2)
WHERE file_url LIKE '%/storage/v1/object/public/documents/%';

UPDATE public.prospect_attachments
SET file_url = split_part(file_url, '/storage/v1/object/sign/documents/', 2)
WHERE file_url LIKE '%/storage/v1/object/sign/documents/%';

UPDATE public.prospect_attachments
SET file_url = split_part(file_url, '?', 1)
WHERE file_url LIKE '%?%';
