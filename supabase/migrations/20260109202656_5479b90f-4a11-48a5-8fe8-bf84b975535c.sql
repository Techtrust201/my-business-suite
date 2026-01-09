-- Ajouter la colonne purchase_order_number à invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS purchase_order_number TEXT;

-- Ajouter les colonnes bancaires à organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS rib TEXT,
ADD COLUMN IF NOT EXISTS bic TEXT;

-- Corriger la contrainte FK sur invoice_lines (même problème que quote_lines)
ALTER TABLE public.invoice_lines
DROP CONSTRAINT IF EXISTS invoice_lines_item_id_fkey;

ALTER TABLE public.invoice_lines
ADD CONSTRAINT invoice_lines_item_id_fkey
FOREIGN KEY (item_id) REFERENCES public.articles(id) ON DELETE SET NULL;