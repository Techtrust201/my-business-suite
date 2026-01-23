-- Add line_type column to quote_lines and invoice_lines to support text-only lines (labels/sections)

-- Add column to quote_lines
ALTER TABLE public.quote_lines ADD COLUMN IF NOT EXISTS line_type text DEFAULT 'item' CHECK (line_type IN ('item', 'text', 'section'));

-- Add column to invoice_lines
ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS line_type text DEFAULT 'item' CHECK (line_type IN ('item', 'text', 'section'));

-- Line types:
-- 'item': Normal line with quantity, price, tax (default)
-- 'text': Text-only line (description only, no pricing)
-- 'section': Section header (bold description, used to group items)

COMMENT ON COLUMN public.quote_lines.line_type IS 'Type of line: item (with pricing), text (label only), or section (header)';
COMMENT ON COLUMN public.invoice_lines.line_type IS 'Type of line: item (with pricing), text (label only), or section (header)';
