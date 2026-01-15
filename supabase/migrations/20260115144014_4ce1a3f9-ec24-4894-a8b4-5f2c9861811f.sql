-- Add purchase_price column to invoice_lines for margin tracking
ALTER TABLE invoice_lines 
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10, 2);

-- Add comment for documentation
COMMENT ON COLUMN invoice_lines.purchase_price IS 'Cost price at the time of invoice creation, copied from article for margin calculation';