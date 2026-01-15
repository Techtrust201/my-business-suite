-- Add columns for French company data
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS siren TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS legal_form TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS naf_code TEXT;