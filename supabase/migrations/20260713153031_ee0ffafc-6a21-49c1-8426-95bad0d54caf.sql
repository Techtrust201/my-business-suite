DROP VIEW IF EXISTS public.my_email_integrations;

CREATE OR REPLACE FUNCTION public.get_my_email_integrations()
RETURNS TABLE (
  id UUID,
  provider TEXT,
  provider_account_id TEXT,
  email_address TEXT,
  display_name TEXT,
  scopes TEXT[],
  datacenter TEXT,
  status TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  refreshed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, provider, provider_account_id, email_address, display_name,
    scopes, datacenter, status, token_expires_at, connected_at,
    refreshed_at, last_error, created_at, updated_at
  FROM public.user_email_integrations
  WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_email_integrations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_email_integrations() TO authenticated;