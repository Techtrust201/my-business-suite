-- COMPTES BANCAIRES
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bank_name TEXT,
    iban TEXT,
    bic TEXT,
    account_number TEXT,
    initial_balance NUMERIC(15,2) DEFAULT 0,
    current_balance NUMERIC(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_organization_id ON public.bank_accounts(organization_id);

-- TRANSACTIONS BANCAIRES
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit')),
    reference TEXT,
    category TEXT,
    notes TEXT,
    is_reconciled BOOLEAN DEFAULT false,
    matched_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    matched_bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
    matched_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    import_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_organization_id ON public.bank_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_account_id ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_is_reconciled ON public.bank_transactions(is_reconciled);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_import_hash ON public.bank_transactions(import_hash) WHERE import_hash IS NOT NULL;

-- RLS bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bank accounts of their organization" ON public.bank_accounts FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert bank accounts for their organization" ON public.bank_accounts FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update bank accounts of their organization" ON public.bank_accounts FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete bank accounts of their organization" ON public.bank_accounts FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- RLS bank_transactions
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bank transactions of their organization" ON public.bank_transactions FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert bank transactions for their organization" ON public.bank_transactions FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update bank transactions of their organization" ON public.bank_transactions FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete bank transactions of their organization" ON public.bank_transactions FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Fonction pour mettre à jour le solde
CREATE OR REPLACE FUNCTION update_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
UPDATE public.bank_accounts
SET current_balance = initial_balance + COALESCE((
    SELECT SUM(CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE 0 END)
    FROM public.bank_transactions
    WHERE bank_account_id = COALESCE(NEW.bank_account_id, OLD.bank_account_id)
), 0),
updated_at = now()
WHERE id = COALESCE(NEW.bank_account_id, OLD.bank_account_id);
RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers
DROP TRIGGER IF EXISTS trigger_update_balance_on_insert ON public.bank_transactions;
CREATE TRIGGER trigger_update_balance_on_insert AFTER INSERT ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();

DROP TRIGGER IF EXISTS trigger_update_balance_on_update ON public.bank_transactions;
CREATE TRIGGER trigger_update_balance_on_update AFTER UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();

DROP TRIGGER IF EXISTS trigger_update_balance_on_delete ON public.bank_transactions;
CREATE TRIGGER trigger_update_balance_on_delete AFTER DELETE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION update_bank_account_balance();