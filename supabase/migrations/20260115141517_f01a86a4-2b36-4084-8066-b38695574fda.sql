-- Add margin-related columns to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10, 2);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS margin NUMERIC(10, 2);
ALTER TABLE articles ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(5, 2);