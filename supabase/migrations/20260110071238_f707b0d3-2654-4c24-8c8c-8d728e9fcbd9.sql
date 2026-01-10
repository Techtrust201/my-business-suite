-- ==============================================
-- SYSTÈME COMPTABLE FRANÇAIS - PLAN COMPTABLE GÉNÉRAL (PCG)
-- ==============================================

-- 1. Table des exercices comptables
CREATE TABLE public.fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- 2. Table du plan comptable
CREATE TABLE public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL,
    name TEXT NOT NULL,
    account_class INTEGER NOT NULL CHECK (account_class BETWEEN 1 AND 8),
    account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    parent_account_number TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, account_number)
);

-- 3. Table des écritures comptables (en-tête)
CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    entry_number TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type TEXT CHECK (reference_type IN ('invoice', 'bill', 'payment', 'bill_payment', 'bank_transaction', 'manual')),
    reference_id UUID,
    journal_type TEXT NOT NULL CHECK (journal_type IN ('sales', 'purchases', 'bank', 'general')),
    status TEXT DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'cancelled')),
    is_balanced BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, entry_number)
);

-- 4. Table des lignes d'écriture (débit/crédit)
CREATE TABLE public.journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
    description TEXT,
    debit NUMERIC(15,2) DEFAULT 0,
    credit NUMERIC(15,2) DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX idx_fiscal_years_org ON public.fiscal_years(organization_id);
CREATE INDEX idx_coa_org ON public.chart_of_accounts(organization_id);
CREATE INDEX idx_coa_number ON public.chart_of_accounts(account_number);
CREATE INDEX idx_coa_class ON public.chart_of_accounts(account_class);
CREATE INDEX idx_je_org ON public.journal_entries(organization_id);
CREATE INDEX idx_je_date ON public.journal_entries(date);
CREATE INDEX idx_je_reference ON public.journal_entries(reference_type, reference_id);
CREATE INDEX idx_jel_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON public.journal_entry_lines(account_id);

-- 5. Ajouter colonnes aux tables existantes
ALTER TABLE public.bank_accounts 
ADD COLUMN IF NOT EXISTS chart_account_id UUID REFERENCES public.chart_of_accounts(id);

ALTER TABLE public.tax_rates 
ADD COLUMN IF NOT EXISTS collected_account_id UUID REFERENCES public.chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS deductible_account_id UUID REFERENCES public.chart_of_accounts(id);

-- 6. Ajouter numéro séquentiel aux organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS journal_entry_next_number INTEGER DEFAULT 1;

-- ==============================================
-- FONCTION : Initialiser le plan comptable PCG
-- ==============================================
CREATE OR REPLACE FUNCTION public.init_chart_of_accounts(_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Vérifier si déjà initialisé
    IF EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE organization_id = _org_id LIMIT 1) THEN
        RETURN;
    END IF;

    INSERT INTO public.chart_of_accounts (organization_id, account_number, name, account_class, account_type, parent_account_number, is_system) VALUES
    -- CLASSE 1 : Capitaux
    (_org_id, '10', 'Capital et réserves', 1, 'equity', NULL, true),
    (_org_id, '101000', 'Capital social', 1, 'equity', '10', true),
    (_org_id, '108000', 'Compte de l''exploitant', 1, 'equity', '10', true),
    (_org_id, '12', 'Résultat de l''exercice', 1, 'equity', NULL, true),
    (_org_id, '120000', 'Résultat de l''exercice (bénéfice)', 1, 'equity', '12', true),
    (_org_id, '129000', 'Résultat de l''exercice (perte)', 1, 'equity', '12', true),
    
    -- CLASSE 2 : Immobilisations
    (_org_id, '21', 'Immobilisations corporelles', 2, 'asset', NULL, true),
    (_org_id, '211000', 'Terrains', 2, 'asset', '21', true),
    (_org_id, '213000', 'Constructions', 2, 'asset', '21', true),
    (_org_id, '215000', 'Matériel et outillage', 2, 'asset', '21', true),
    (_org_id, '218000', 'Autres immobilisations corporelles', 2, 'asset', '21', true),
    
    -- CLASSE 3 : Stocks
    (_org_id, '31', 'Matières premières', 3, 'asset', NULL, true),
    (_org_id, '310000', 'Matières premières', 3, 'asset', '31', true),
    (_org_id, '37', 'Stocks de marchandises', 3, 'asset', NULL, true),
    (_org_id, '370000', 'Stocks de marchandises', 3, 'asset', '37', true),
    
    -- CLASSE 4 : Tiers
    (_org_id, '40', 'Fournisseurs et comptes rattachés', 4, 'liability', NULL, true),
    (_org_id, '401000', 'Fournisseurs', 4, 'liability', '40', true),
    (_org_id, '41', 'Clients et comptes rattachés', 4, 'asset', NULL, true),
    (_org_id, '411000', 'Clients', 4, 'asset', '41', true),
    (_org_id, '44', 'État et autres collectivités publiques', 4, 'liability', NULL, true),
    (_org_id, '44566', 'TVA déductible sur biens et services', 4, 'asset', '44', true),
    (_org_id, '445660', 'TVA déductible sur achats', 4, 'asset', '44566', true),
    (_org_id, '44571', 'TVA collectée', 4, 'liability', '44', true),
    (_org_id, '445710', 'TVA collectée sur ventes', 4, 'liability', '44571', true),
    (_org_id, '44551', 'TVA à décaisser', 4, 'liability', '44', true),
    (_org_id, '44567', 'Crédit de TVA à reporter', 4, 'asset', '44', true),
    
    -- CLASSE 5 : Financier
    (_org_id, '51', 'Banques, établissements financiers', 5, 'asset', NULL, true),
    (_org_id, '512000', 'Banque', 5, 'asset', '51', true),
    (_org_id, '53', 'Caisse', 5, 'asset', NULL, true),
    (_org_id, '531000', 'Caisse', 5, 'asset', '53', true),
    
    -- CLASSE 6 : Charges
    (_org_id, '60', 'Achats', 6, 'expense', NULL, true),
    (_org_id, '601000', 'Achats de matières premières', 6, 'expense', '60', true),
    (_org_id, '602000', 'Achats stockés - Autres approvisionnements', 6, 'expense', '60', true),
    (_org_id, '604000', 'Achats d''études et prestations', 6, 'expense', '60', true),
    (_org_id, '606000', 'Achats non stockés de matières et fournitures', 6, 'expense', '60', true),
    (_org_id, '607000', 'Achats de marchandises', 6, 'expense', '60', true),
    (_org_id, '61', 'Services extérieurs', 6, 'expense', NULL, true),
    (_org_id, '613000', 'Locations', 6, 'expense', '61', true),
    (_org_id, '615000', 'Entretien et réparations', 6, 'expense', '61', true),
    (_org_id, '616000', 'Primes d''assurance', 6, 'expense', '61', true),
    (_org_id, '62', 'Autres services extérieurs', 6, 'expense', NULL, true),
    (_org_id, '622000', 'Rémunérations d''intermédiaires et honoraires', 6, 'expense', '62', true),
    (_org_id, '623000', 'Publicité, publications, relations publiques', 6, 'expense', '62', true),
    (_org_id, '625000', 'Déplacements, missions et réceptions', 6, 'expense', '62', true),
    (_org_id, '626000', 'Frais postaux et de télécommunications', 6, 'expense', '62', true),
    (_org_id, '627000', 'Services bancaires et assimilés', 6, 'expense', '62', true),
    (_org_id, '63', 'Impôts, taxes et versements assimilés', 6, 'expense', NULL, true),
    (_org_id, '635000', 'Autres impôts, taxes et versements assimilés', 6, 'expense', '63', true),
    (_org_id, '64', 'Charges de personnel', 6, 'expense', NULL, true),
    (_org_id, '641000', 'Rémunérations du personnel', 6, 'expense', '64', true),
    (_org_id, '645000', 'Charges de sécurité sociale', 6, 'expense', '64', true),
    (_org_id, '67', 'Charges exceptionnelles', 6, 'expense', NULL, true),
    (_org_id, '671000', 'Charges exceptionnelles sur opérations de gestion', 6, 'expense', '67', true),
    
    -- CLASSE 7 : Produits
    (_org_id, '70', 'Ventes de produits et services', 7, 'income', NULL, true),
    (_org_id, '701000', 'Ventes de produits finis', 7, 'income', '70', true),
    (_org_id, '706000', 'Prestations de services', 7, 'income', '70', true),
    (_org_id, '707000', 'Ventes de marchandises', 7, 'income', '70', true),
    (_org_id, '708000', 'Produits des activités annexes', 7, 'income', '70', true),
    (_org_id, '74', 'Subventions d''exploitation', 7, 'income', NULL, true),
    (_org_id, '740000', 'Subventions d''exploitation', 7, 'income', '74', true),
    (_org_id, '77', 'Produits exceptionnels', 7, 'income', NULL, true),
    (_org_id, '771000', 'Produits exceptionnels sur opérations de gestion', 7, 'income', '77', true);
    
    -- Lier les taux de TVA aux comptes
    UPDATE public.tax_rates 
    SET collected_account_id = (SELECT id FROM public.chart_of_accounts WHERE organization_id = _org_id AND account_number = '445710'),
        deductible_account_id = (SELECT id FROM public.chart_of_accounts WHERE organization_id = _org_id AND account_number = '445660')
    WHERE organization_id = _org_id;
END;
$$;

-- ==============================================
-- FONCTION : Obtenir le prochain numéro d'écriture
-- ==============================================
CREATE OR REPLACE FUNCTION public.get_next_journal_entry_number(_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _next_num INTEGER;
    _result TEXT;
BEGIN
    SELECT journal_entry_next_number INTO _next_num
    FROM public.organizations
    WHERE id = _org_id
    FOR UPDATE;
    
    UPDATE public.organizations
    SET journal_entry_next_number = journal_entry_next_number + 1
    WHERE id = _org_id;
    
    _result := 'EC-' || LPAD(_next_num::TEXT, 6, '0');
    RETURN _result;
END;
$$;

-- ==============================================
-- RLS Policies
-- ==============================================

-- fiscal_years
ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization fiscal years"
    ON public.fiscal_years FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert fiscal years for their organization"
    ON public.fiscal_years FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their organization fiscal years"
    ON public.fiscal_years FOR UPDATE
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete their organization fiscal years"
    ON public.fiscal_years FOR DELETE
    USING (organization_id = public.get_user_organization_id());

-- chart_of_accounts
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization chart of accounts"
    ON public.chart_of_accounts FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert accounts for their organization"
    ON public.chart_of_accounts FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their organization accounts"
    ON public.chart_of_accounts FOR UPDATE
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete their organization accounts"
    ON public.chart_of_accounts FOR DELETE
    USING (organization_id = public.get_user_organization_id() AND is_system = false);

-- journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization journal entries"
    ON public.journal_entries FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert journal entries for their organization"
    ON public.journal_entries FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update their organization journal entries"
    ON public.journal_entries FOR UPDATE
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete their organization journal entries"
    ON public.journal_entries FOR DELETE
    USING (organization_id = public.get_user_organization_id());

-- journal_entry_lines (via journal_entries)
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journal entry lines"
    ON public.journal_entry_lines FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.journal_entries je 
        WHERE je.id = journal_entry_id 
        AND je.organization_id = public.get_user_organization_id()
    ));

CREATE POLICY "Users can insert journal entry lines"
    ON public.journal_entry_lines FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.journal_entries je 
        WHERE je.id = journal_entry_id 
        AND je.organization_id = public.get_user_organization_id()
    ));

CREATE POLICY "Users can update journal entry lines"
    ON public.journal_entry_lines FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.journal_entries je 
        WHERE je.id = journal_entry_id 
        AND je.organization_id = public.get_user_organization_id()
    ));

CREATE POLICY "Users can delete journal entry lines"
    ON public.journal_entry_lines FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.journal_entries je 
        WHERE je.id = journal_entry_id 
        AND je.organization_id = public.get_user_organization_id()
    ));

-- Triggers pour updated_at
CREATE TRIGGER update_chart_of_accounts_updated_at
    BEFORE UPDATE ON public.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chart_of_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_entry_lines;