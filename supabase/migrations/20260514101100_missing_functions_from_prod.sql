-- =============================================
-- N23 — Dette schema : recreer les fonctions / tables referencees
-- =============================================
-- Plusieurs migrations referencent `public.organization_roles`,
-- `public.get_user_organizations()` et
-- `public.get_user_organizations_with_role(text)` sans qu'aucune
-- migration du repo ne les definisse. Le schema reel en prod en
-- possede une definition non versionnee, ce qui fait diverger les
-- environnements (impossible de reset une base locale).
--
-- Cette migration recree des definitions plausibles et idempotentes
-- pour debloquer un `db reset` local et fournir un baseline aux
-- futurs ajustements RLS. La definition prod doit etre comparee
-- via `supabase db diff` apres deploiement de cette migration.
-- =============================================

-- ---------- Table organization_roles ----------
-- Squelette minimal compatible avec les FK existantes :
--   - notify_role_id (auto_reminder_rules.notify_role_id)
--   - applies_to_role_id (commission_rules.applies_to_role_id)
-- On reste simple : id, organization_id, name, permissions JSONB.
-- Une vraie definition prod plus riche restera valide tant que la
-- colonne `id` UUID PK existe.
CREATE TABLE IF NOT EXISTS public.organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, name)
);

ALTER TABLE public.organization_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members view organization_roles" ON public.organization_roles;
CREATE POLICY "Org members view organization_roles" ON public.organization_roles
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Org admins manage organization_roles" ON public.organization_roles;
CREATE POLICY "Org admins manage organization_roles" ON public.organization_roles
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ---------- get_user_organizations() ----------
-- Renvoie l'ensemble des organization_id auxquels l'utilisateur courant
-- appartient (via user_roles). Utilisee dans toutes les RLS scoped org.
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_user_organizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO authenticated;

-- ---------- get_user_organizations_with_role(text) ----------
-- Renvoie les organization_id auxquels l'utilisateur courant possede
-- le role demande (ex: 'admin').
CREATE OR REPLACE FUNCTION public.get_user_organizations_with_role(role_name text)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND role::text = role_name;
$$;

REVOKE ALL ON FUNCTION public.get_user_organizations_with_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_organizations_with_role(text) TO authenticated;
