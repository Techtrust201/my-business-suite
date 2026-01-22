-- =============================================
-- PHASE 1: CRM PROSPECTION - TABLES DE BASE
-- =============================================

-- 1. Table des statuts commerciaux paramétrables
CREATE TABLE public.prospect_statuses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    icon TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_final_positive BOOLEAN NOT NULL DEFAULT false,
    is_final_negative BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Table des prospects (entreprises prospectées)
CREATE TABLE public.prospects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    siren TEXT,
    siret TEXT,
    vat_number TEXT,
    legal_form TEXT,
    naf_code TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'FR',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    geocoded_at TIMESTAMP WITH TIME ZONE,
    status_id UUID REFERENCES public.prospect_statuses(id) ON DELETE SET NULL,
    assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source TEXT DEFAULT 'terrain',
    website TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    converted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Table des contacts par prospect
CREATE TABLE public.prospect_contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Table des visites terrain
CREATE TABLE public.prospect_visits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    visited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    duration_minutes INTEGER,
    status_before_id UUID REFERENCES public.prospect_statuses(id) ON DELETE SET NULL,
    status_after_id UUID REFERENCES public.prospect_statuses(id) ON DELETE SET NULL,
    notes TEXT,
    next_action TEXT,
    next_action_date DATE,
    visit_latitude NUMERIC(10, 7),
    visit_longitude NUMERIC(10, 7),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Table des emails envoyés aux prospects
CREATE TABLE public.prospect_emails (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    prospect_contact_id UUID REFERENCES public.prospect_contacts(id) ON DELETE SET NULL,
    sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- INDEX POUR PERFORMANCES
-- =============================================

CREATE INDEX idx_prospects_organization ON public.prospects(organization_id);
CREATE INDEX idx_prospects_status ON public.prospects(status_id);
CREATE INDEX idx_prospects_assigned_to ON public.prospects(assigned_to_user_id);
CREATE INDEX idx_prospects_coordinates ON public.prospects(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_prospects_postal_code ON public.prospects(postal_code);
CREATE INDEX idx_prospect_visits_prospect ON public.prospect_visits(prospect_id);
CREATE INDEX idx_prospect_visits_visited_at ON public.prospect_visits(visited_at);
CREATE INDEX idx_prospect_contacts_prospect ON public.prospect_contacts(prospect_id);
CREATE INDEX idx_prospect_emails_prospect ON public.prospect_emails(prospect_id);
CREATE INDEX idx_prospect_statuses_organization ON public.prospect_statuses(organization_id);

-- =============================================
-- TRIGGERS UPDATED_AT
-- =============================================

CREATE TRIGGER update_prospect_statuses_updated_at
    BEFORE UPDATE ON public.prospect_statuses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at
    BEFORE UPDATE ON public.prospects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospect_contacts_updated_at
    BEFORE UPDATE ON public.prospect_contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.prospect_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_emails ENABLE ROW LEVEL SECURITY;

-- Policies pour prospect_statuses
CREATE POLICY "Users can view their organization prospect statuses"
    ON public.prospect_statuses FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage prospect statuses"
    ON public.prospect_statuses FOR ALL
    USING (organization_id = get_user_organization_id() AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert prospect statuses for their organization"
    ON public.prospect_statuses FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization prospect statuses"
    ON public.prospect_statuses FOR UPDATE
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization prospect statuses"
    ON public.prospect_statuses FOR DELETE
    USING (organization_id = get_user_organization_id());

-- Policies pour prospects
CREATE POLICY "Users can view their organization prospects"
    ON public.prospects FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert prospects for their organization"
    ON public.prospects FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization prospects"
    ON public.prospects FOR UPDATE
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization prospects"
    ON public.prospects FOR DELETE
    USING (organization_id = get_user_organization_id());

-- Policies pour prospect_contacts (via prospect)
CREATE POLICY "Users can view prospect contacts"
    ON public.prospect_contacts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.prospects p
        WHERE p.id = prospect_contacts.prospect_id
        AND p.organization_id = get_user_organization_id()
    ));

CREATE POLICY "Users can insert prospect contacts"
    ON public.prospect_contacts FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.prospects p
        WHERE p.id = prospect_contacts.prospect_id
        AND p.organization_id = get_user_organization_id()
    ));

CREATE POLICY "Users can update prospect contacts"
    ON public.prospect_contacts FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.prospects p
        WHERE p.id = prospect_contacts.prospect_id
        AND p.organization_id = get_user_organization_id()
    ));

CREATE POLICY "Users can delete prospect contacts"
    ON public.prospect_contacts FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.prospects p
        WHERE p.id = prospect_contacts.prospect_id
        AND p.organization_id = get_user_organization_id()
    ));

-- Policies pour prospect_visits
CREATE POLICY "Users can view their organization prospect visits"
    ON public.prospect_visits FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert prospect visits for their organization"
    ON public.prospect_visits FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization prospect visits"
    ON public.prospect_visits FOR UPDATE
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization prospect visits"
    ON public.prospect_visits FOR DELETE
    USING (organization_id = get_user_organization_id());

-- Policies pour prospect_emails
CREATE POLICY "Users can view their organization prospect emails"
    ON public.prospect_emails FOR SELECT
    USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert prospect emails for their organization"
    ON public.prospect_emails FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

-- =============================================
-- FONCTION POUR INITIALISER LES STATUTS PAR DEFAUT
-- =============================================

CREATE OR REPLACE FUNCTION public.init_prospect_statuses(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Vérifier si déjà initialisé
    IF EXISTS (SELECT 1 FROM public.prospect_statuses WHERE organization_id = _org_id LIMIT 1) THEN
        RETURN;
    END IF;

    INSERT INTO public.prospect_statuses (organization_id, name, color, position, is_default, is_final_positive, is_final_negative) VALUES
    (_org_id, 'À démarcher', '#6B7280', 0, true, false, false),
    (_org_id, 'Démarché', '#3B82F6', 1, false, false, false),
    (_org_id, 'Intéressé', '#F59E0B', 2, false, false, false),
    (_org_id, 'En négociation', '#8B5CF6', 3, false, false, false),
    (_org_id, 'Client signé', '#10B981', 4, false, true, false),
    (_org_id, 'Pas intéressé', '#EF4444', 5, false, false, true);
END;
$$;