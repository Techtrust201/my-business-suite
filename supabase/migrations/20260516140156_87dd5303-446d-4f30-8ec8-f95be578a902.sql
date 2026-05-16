
-- Re-apply RPCs (idempotent) so generated types stay in sync.

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  email text,
  role app_role,
  expires_at timestamptz,
  organization_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT i.id, i.organization_id, i.email, i.role, i.expires_at, o.name
  FROM public.invitations i
  LEFT JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = p_token AND i.accepted_at IS NULL AND i.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_existing_role_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invitation FROM public.invitations
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > now() LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide ou expiree' USING ERRCODE = '22023';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF lower(v_invitation.email) <> lower(coalesce(v_user_email, '')) THEN
    RAISE EXCEPTION 'Cette invitation est destinee a une autre adresse email' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles SET organization_id = v_invitation.organization_id WHERE id = v_user_id;

  SELECT id INTO v_existing_role_id FROM public.user_roles
  WHERE user_id = v_user_id AND organization_id = v_invitation.organization_id LIMIT 1;

  IF v_existing_role_id IS NOT NULL THEN
    UPDATE public.user_roles SET role = v_invitation.role WHERE id = v_existing_role_id;
  ELSE
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (v_user_id, v_invitation.organization_id, v_invitation.role);
  END IF;

  UPDATE public.invitations SET accepted_at = now() WHERE id = v_invitation.id;
  RETURN v_invitation.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation_by_token(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT
);
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own platform_admin row" ON public.platform_admins;
CREATE POLICY "Users can view their own platform_admin row" ON public.platform_admins
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
