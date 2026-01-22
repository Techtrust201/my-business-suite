-- Create invitations table for user invitation system
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'readonly',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view invitations for their organization"
ON public.invitations
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id() 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete invitations"
ON public.invitations
FOR DELETE
USING (
  organization_id = get_user_organization_id() 
  AND has_role(auth.uid(), 'admin')
);

-- Allow anyone to view invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
ON public.invitations
FOR SELECT
USING (token IS NOT NULL);

-- Create index for fast token lookup
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_organization ON public.invitations(organization_id);