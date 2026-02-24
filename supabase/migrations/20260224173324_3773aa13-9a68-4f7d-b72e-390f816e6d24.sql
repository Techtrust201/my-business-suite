ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;