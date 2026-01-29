-- Create prospect_attachments table
CREATE TABLE public.prospect_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospect_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Organization members can view their prospect attachments"
  ON public.prospect_attachments
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organization members can insert prospect attachments"
  ON public.prospect_attachments
  FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organization members can delete their prospect attachments"
  ON public.prospect_attachments
  FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
  ));

-- Index for faster lookups
CREATE INDEX idx_prospect_attachments_prospect_id ON public.prospect_attachments(prospect_id);
CREATE INDEX idx_prospect_attachments_organization_id ON public.prospect_attachments(organization_id);