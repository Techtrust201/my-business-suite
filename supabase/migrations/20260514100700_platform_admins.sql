-- =============================================
-- N13 — Retirer SUPER_ADMIN_EMAILS du bundle
-- =============================================
-- Avant : liste d'emails super-admin hardcodee a la fois cote frontend
-- (src/pages/Parametres.tsx) et cote Edge Function (admin-reset-password).
-- Surface d'attaque : enumeration des comptes privilegies, et un attaquant
-- qui contournerait le check JS savait quels comptes cibler.
--
-- Apres : table `platform_admins` + RPC `is_platform_admin()` qui retourne
-- TRUE si auth.uid() y est. La liste vit en base, plus dans le bundle.
-- =============================================

CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Lecture : un user peut savoir s'il est lui-meme platform_admin, mais on
-- evite la liste exhaustive. Pour la liste complete il faut passer par le
-- service_role.
DROP POLICY IF EXISTS "Users can view their own platform_admin row" ON public.platform_admins;
CREATE POLICY "Users can view their own platform_admin row" ON public.platform_admins
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Ecriture : reserve a postgres / service_role (pas de policy INSERT pour
-- authenticated → seule la service_role peut ajouter / retirer).

-- RPC sure que l'app peut appeler pour decider de l'affichage UI.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Seed initial : on conserve les deux comptes historiques (les emails
-- etaient deja publics dans le bundle, donc aucune fuite supplementaire).
-- Si l'un d'eux n'existe pas, l'INSERT est simplement ignore.
INSERT INTO public.platform_admins (user_id, notes)
SELECT u.id, 'Seed initial (migration N13)'
FROM auth.users u
WHERE lower(u.email) IN ('hugoportier3@gmail.com', 'contact@tech-trust.fr')
ON CONFLICT (user_id) DO NOTHING;
