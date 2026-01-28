-- Add payment_method_text column to quotes and invoices

-- Add column to quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_method_text text;

-- Add column to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method_text text;

COMMENT ON COLUMN public.quotes.payment_method_text IS 'Custom payment method information text to display on quotes';
COMMENT ON COLUMN public.invoices.payment_method_text IS 'Custom payment method information text to display on invoices';
