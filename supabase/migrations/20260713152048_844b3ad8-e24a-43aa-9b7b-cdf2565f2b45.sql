CREATE TABLE public.zoho_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  zoho_account_id TEXT NOT NULL,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoho_integrations TO authenticated;
GRANT ALL ON public.zoho_integrations TO service_role;

ALTER TABLE public.zoho_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their org zoho integration"
ON public.zoho_integrations FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can insert their org zoho integration"
ON public.zoho_integrations FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update their org zoho integration"
ON public.zoho_integrations FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete their org zoho integration"
ON public.zoho_integrations FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_organization_id()
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE TRIGGER update_zoho_integrations_updated_at
BEFORE UPDATE ON public.zoho_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();