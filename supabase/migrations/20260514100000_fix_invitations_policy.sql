-- =============================================
-- N1 — Fix policy "invitations" qui fuit toutes les invitations
-- =============================================
-- Avant : USING (token IS NOT NULL) permettait de lister
-- toutes les invitations (emails, tokens, org_id, role).
-- Apres : 2 RPC SECURITY DEFINER qui ne renvoient qu'une seule
-- ligne apres validation du token.

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

-- Lookup invitation par token (pour l'ecran d'acceptation)
-- Ne retourne qu'UNE ligne si le token correspond exactement.
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
  SELECT
    i.id,
    i.organization_id,
    i.email,
    i.role,
    i.expires_at,
    o.name AS organization_name
  FROM public.invitations i
  LEFT JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = p_token
    AND i.accepted_at IS NULL
    AND i.expires_at > now()
  LIMIT 1;
$$;

-- Acceptation transactionnelle : profil + role + accepted_at en une seule
-- operation cote serveur, scopee a auth.uid() (pas de _user_id arbitraire).
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
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide ou expiree'
      USING ERRCODE = '22023';
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  IF lower(v_invitation.email) <> lower(coalesce(v_user_email, '')) THEN
    RAISE EXCEPTION 'Cette invitation est destinee a une autre adresse email'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET organization_id = v_invitation.organization_id
  WHERE id = v_user_id;

  SELECT id INTO v_existing_role_id
  FROM public.user_roles
  WHERE user_id = v_user_id
    AND organization_id = v_invitation.organization_id
  LIMIT 1;

  IF v_existing_role_id IS NOT NULL THEN
    UPDATE public.user_roles
    SET role = v_invitation.role
    WHERE id = v_existing_role_id;
  ELSE
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (v_user_id, v_invitation.organization_id, v_invitation.role);
  END IF;

  UPDATE public.invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN v_invitation.organization_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.accept_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invitation_by_token(text) TO authenticated;
