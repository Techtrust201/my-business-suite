-- =============================================
-- MVP BOOKS - SCHÉMA DE BASE
-- =============================================

-- Enum pour les rôles utilisateurs (sécurité)
CREATE TYPE public.app_role AS ENUM ('admin', 'accountant', 'sales', 'readonly');

-- Enum pour les statuts
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired');
CREATE TYPE public.bill_status AS ENUM ('draft', 'received', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.contact_type AS ENUM ('client', 'supplier', 'both');
CREATE TYPE public.item_type AS ENUM ('product', 'service');
CREATE TYPE public.payment_method AS ENUM ('bank_transfer', 'card', 'cash', 'check', 'other');

-- =============================================
-- ORGANISATION (TENANT)
-- =============================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    legal_name TEXT,
    siret TEXT,
    vat_number TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'FR',
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    currency TEXT DEFAULT 'EUR',
    timezone TEXT DEFAULT 'Europe/Paris',
    invoice_prefix TEXT DEFAULT 'FAC',
    invoice_next_number INTEGER DEFAULT 1,
    quote_prefix TEXT DEFAULT 'DEV',
    quote_next_number INTEGER DEFAULT 1,
    default_payment_terms INTEGER DEFAULT 30,
    legal_mentions TEXT,
    bank_details TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PROFILES UTILISATEURS
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RÔLES UTILISATEURS (TABLE SÉPARÉE - SÉCURITÉ)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'readonly',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, organization_id, role)
);

-- =============================================
-- TAUX DE TVA
-- =============================================
CREATE TABLE public.tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    rate NUMERIC(5,2) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CONTACTS (CLIENTS / FOURNISSEURS)
-- =============================================
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    type contact_type NOT NULL DEFAULT 'client',
    company_name TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    siret TEXT,
    vat_number TEXT,
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city TEXT,
    billing_postal_code TEXT,
    billing_country TEXT DEFAULT 'FR',
    shipping_address_line1 TEXT,
    shipping_address_line2 TEXT,
    shipping_city TEXT,
    shipping_postal_code TEXT,
    shipping_country TEXT DEFAULT 'FR',
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CATALOGUE ARTICLES
-- =============================================
CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    type item_type NOT NULL DEFAULT 'product',
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(12,2) DEFAULT 0,
    tax_rate_id UUID REFERENCES public.tax_rates(id) ON DELETE SET NULL,
    unit TEXT DEFAULT 'unité',
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- DEVIS
-- =============================================
CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    number TEXT NOT NULL,
    status quote_status NOT NULL DEFAULT 'draft',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    subject TEXT,
    notes TEXT,
    terms TEXT,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    converted_to_invoice_id UUID,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- LIGNES DE DEVIS
-- =============================================
CREATE TABLE public.quote_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    line_total NUMERIC(12,2) DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FACTURES
-- =============================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    number TEXT NOT NULL,
    status invoice_status NOT NULL DEFAULT 'draft',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subject TEXT,
    notes TEXT,
    terms TEXT,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    amount_paid NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- LIGNES DE FACTURE
-- =============================================
CREATE TABLE public.invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    line_total NUMERIC(12,2) DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PAIEMENTS REÇUS
-- =============================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    method payment_method NOT NULL DEFAULT 'bank_transfer',
    reference TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FACTURES FOURNISSEURS (BILLS)
-- =============================================
CREATE TABLE public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    number TEXT,
    vendor_reference TEXT,
    status bill_status NOT NULL DEFAULT 'draft',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subject TEXT,
    notes TEXT,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    amount_paid NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    attachment_url TEXT,
    paid_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- LIGNES DE BILLS
-- =============================================
CREATE TABLE public.bill_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    line_total NUMERIC(12,2) DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PAIEMENTS FOURNISSEURS
-- =============================================
CREATE TABLE public.bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    method payment_method NOT NULL DEFAULT 'bank_transfer',
    reference TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- AUDIT LOG (IMMUABLE)
-- =============================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FONCTIONS UTILITAIRES
-- =============================================

-- Fonction pour vérifier les rôles (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Fonction pour obtenir l'organization_id de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
$$;

-- Fonction pour créer un profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id, 
        NEW.email,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'last_name'
    );
    RETURN NEW;
END;
$$;

-- Trigger pour créer le profil à l'inscription
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Triggers updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour générer le prochain numéro de facture
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _prefix TEXT;
    _next_num INTEGER;
    _result TEXT;
BEGIN
    SELECT invoice_prefix, invoice_next_number
    INTO _prefix, _next_num
    FROM public.organizations
    WHERE id = _org_id
    FOR UPDATE;
    
    UPDATE public.organizations
    SET invoice_next_number = invoice_next_number + 1
    WHERE id = _org_id;
    
    _result := _prefix || '-' || LPAD(_next_num::TEXT, 5, '0');
    RETURN _result;
END;
$$;

-- Fonction pour générer le prochain numéro de devis
CREATE OR REPLACE FUNCTION public.get_next_quote_number(_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _prefix TEXT;
    _next_num INTEGER;
    _result TEXT;
BEGIN
    SELECT quote_prefix, quote_next_number
    INTO _prefix, _next_num
    FROM public.organizations
    WHERE id = _org_id
    FOR UPDATE;
    
    UPDATE public.organizations
    SET quote_next_number = quote_next_number + 1
    WHERE id = _org_id;
    
    _result := _prefix || '-' || LPAD(_next_num::TEXT, 5, '0');
    RETURN _result;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ORGANIZATIONS: Users can view their organization
CREATE POLICY "Users can view their organization" ON public.organizations 
    FOR SELECT USING (id = public.get_user_organization_id());
CREATE POLICY "Admins can update organization" ON public.organizations 
    FOR UPDATE USING (id = public.get_user_organization_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create organization" ON public.organizations 
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- USER_ROLES: Users can view roles in their organization
CREATE POLICY "Users can view roles in their org" ON public.user_roles 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Admins can manage roles" ON public.user_roles 
    FOR ALL USING (organization_id = public.get_user_organization_id() AND public.has_role(auth.uid(), 'admin'));

-- TAX_RATES: Organization members can view and manage
CREATE POLICY "Users can view tax rates" ON public.tax_rates 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can manage tax rates" ON public.tax_rates 
    FOR ALL USING (organization_id = public.get_user_organization_id());

-- CONTACTS: Organization members can view and manage
CREATE POLICY "Users can view contacts" ON public.contacts 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can manage contacts" ON public.contacts 
    FOR ALL USING (organization_id = public.get_user_organization_id());

-- ITEMS: Organization members can view and manage
CREATE POLICY "Users can view items" ON public.items 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can manage items" ON public.items 
    FOR ALL USING (organization_id = public.get_user_organization_id());

-- QUOTES: Organization members can view and manage
CREATE POLICY "Users can view quotes" ON public.quotes 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can manage quotes" ON public.quotes 
    FOR ALL USING (organization_id = public.get_user_organization_id());

-- QUOTE_LINES: Access through quote
CREATE POLICY "Users can view quote lines" ON public.quote_lines 
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.quotes q 
        WHERE q.id = quote_id AND q.organization_id = public.get_user_organization_id()
    ));
CREATE POLICY "Users can manage quote lines" ON public.quote_lines 
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.quotes q 
        WHERE q.id = quote_id AND q.organization_id = public.get_user_organization_id()
    ));

-- INVOICES: Organization members can view and manage
CREATE POLICY "Users can view invoices" ON public.invoices 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can manage invoices" ON public.invoices 
    FOR ALL USING (organization_id = public.get_user_organization_id());

-- INVOICE_LINES: Access through invoice
CREATE POLICY "Users can view invoice lines" ON public.invoice_lines 
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.invoices i 
        WHERE i.id = invoice_id AND i.organization_id = public.get_user_organization_id()
    ));
CREATE POLICY "Users can manage invoice lines" ON public.invoice_lines 
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.invoices i 
        WHERE i.id = invoice_id AND i.organization_id = public.get_user_organization_id()
    ));

-- PAYMENTS: Organization members can view and manage
CREATE POLICY "Users can view payments" ON public.payments 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can manage payments" ON public.payments 
    FOR ALL USING (organization_id = public.get_user_organization_id());

-- BILLS: Organization members can view and manage
CREATE POLICY "Users can view bills" ON public.bills 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can manage bills" ON public.bills 
    FOR ALL USING (organization_id = public.get_user_organization_id());

-- BILL_LINES: Access through bill
CREATE POLICY "Users can view bill lines" ON public.bill_lines 
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.bills b 
        WHERE b.id = bill_id AND b.organization_id = public.get_user_organization_id()
    ));
CREATE POLICY "Users can manage bill lines" ON public.bill_lines 
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.bills b 
        WHERE b.id = bill_id AND b.organization_id = public.get_user_organization_id()
    ));

-- BILL_PAYMENTS: Organization members can view and manage
CREATE POLICY "Users can view bill payments" ON public.bill_payments 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can manage bill payments" ON public.bill_payments 
    FOR ALL USING (organization_id = public.get_user_organization_id());

-- AUDIT_LOGS: Users can view their organization's logs (read-only)
CREATE POLICY "Users can view audit logs" ON public.audit_logs 
    FOR SELECT USING (organization_id = public.get_user_organization_id());
CREATE POLICY "System can insert audit logs" ON public.audit_logs 
    FOR INSERT WITH CHECK (true);

-- =============================================
-- INDEX POUR PERFORMANCE
-- =============================================
CREATE INDEX idx_profiles_organization ON public.profiles(organization_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org ON public.user_roles(organization_id);
CREATE INDEX idx_contacts_organization ON public.contacts(organization_id);
CREATE INDEX idx_contacts_type ON public.contacts(organization_id, type);
CREATE INDEX idx_items_organization ON public.items(organization_id);
CREATE INDEX idx_quotes_organization ON public.quotes(organization_id);
CREATE INDEX idx_quotes_contact ON public.quotes(contact_id);
CREATE INDEX idx_quotes_status ON public.quotes(organization_id, status);
CREATE INDEX idx_invoices_organization ON public.invoices(organization_id);
CREATE INDEX idx_invoices_contact ON public.invoices(contact_id);
CREATE INDEX idx_invoices_status ON public.invoices(organization_id, status);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_bills_organization ON public.bills(organization_id);
CREATE INDEX idx_bills_contact ON public.bills(contact_id);
CREATE INDEX idx_bills_status ON public.bills(organization_id, status);
CREATE INDEX idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);