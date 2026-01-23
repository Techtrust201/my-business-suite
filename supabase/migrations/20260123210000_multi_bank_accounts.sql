-- Multi-bank accounts management

-- Add missing columns to existing bank_accounts table (if they don't exist)
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS account_holder text;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_org_id ON public.bank_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON public.bank_accounts(is_default);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON public.bank_accounts(is_active);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Organizations can view their bank accounts." ON public.bank_accounts
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Organization admins can manage bank accounts." ON public.bank_accounts
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations_with_role('admin')))
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations_with_role('admin')));

-- Add bank_account_id to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts;

-- Trigger for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one default account per organization
CREATE OR REPLACE FUNCTION public.ensure_single_default_bank_account()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE public.bank_accounts
        SET is_default = FALSE
        WHERE organization_id = NEW.organization_id
          AND id != NEW.id
          AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_default_bank_account_trigger
    BEFORE INSERT OR UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_single_default_bank_account();

-- Migrate existing bank info from organizations to bank_accounts (if needed)
-- This creates a default bank account from the existing organization bank info
INSERT INTO public.bank_accounts (organization_id, name, bank_name, iban, bic, account_holder, is_default, is_active)
SELECT 
    id as organization_id,
    'Compte principal' as name,
    COALESCE(bank_name, 'Banque') as bank_name,
    COALESCE(bank_iban, '') as iban,
    bank_bic as bic,
    name as account_holder,
    TRUE as is_default,
    TRUE as is_active
FROM public.organizations
WHERE bank_iban IS NOT NULL AND bank_iban != ''
ON CONFLICT DO NOTHING;
