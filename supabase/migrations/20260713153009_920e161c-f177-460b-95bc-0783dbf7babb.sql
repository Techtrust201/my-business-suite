-- 1. Nettoyage de l'ancienne table org-based
DROP TABLE IF EXISTS public.zoho_integrations CASCADE;

-- 2. Table principale : intégration email par utilisateur
CREATE TABLE public.user_email_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'zoho',
  provider_account_id TEXT NOT NULL,
  provider_user_id TEXT,
  email_address TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  datacenter TEXT NOT NULL DEFAULT 'eu',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reconnect_required', 'revoked', 'error')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  refreshed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX idx_uei_user ON public.user_email_integrations(user_id);

-- Aucun accès direct aux tokens depuis authenticated : PAS de GRANT SELECT ici.
GRANT ALL ON public.user_email_integrations TO service_role;

ALTER TABLE public.user_email_integrations ENABLE ROW LEVEL SECURITY;

-- RLS : même sans grants SELECT, on protège aussi via policy en cas de futur grant.
CREATE POLICY "no_client_read_tokens"
ON public.user_email_integrations FOR SELECT
TO authenticated
USING (false);

-- Vue publique sûre (sans tokens) pour lire le statut côté frontend
CREATE OR REPLACE VIEW public.my_email_integrations AS
SELECT
  id, user_id, organization_id, provider, provider_account_id,
  email_address, display_name, scopes, datacenter, status,
  token_expires_at, connected_at, refreshed_at, last_error,
  created_at, updated_at
FROM public.user_email_integrations
WHERE user_id = auth.uid();

GRANT SELECT ON public.my_email_integrations TO authenticated;

-- 3. OAuth states à usage unique
CREATE TABLE public.oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  return_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oauth_states_user ON public.oauth_states(user_id);

GRANT ALL ON public.oauth_states TO service_role;

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_client_access_oauth_states"
ON public.oauth_states FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 4. Journaux d'envoi email par utilisateur
CREATE TABLE public.email_send_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  integration_id UUID REFERENCES public.user_email_integrations(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'zoho',
  recipient TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  document_type TEXT,
  document_number TEXT,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_send_logs_user ON public.email_send_logs(user_id, created_at DESC);

GRANT SELECT ON public.email_send_logs TO authenticated;
GRANT ALL ON public.email_send_logs TO service_role;

ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_send_logs"
ON public.email_send_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Trigger updated_at
CREATE TRIGGER trg_uei_updated_at
BEFORE UPDATE ON public.user_email_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();