-- Migration pour les notes de prospect avec auteur et date
-- Cette table permet d'avoir plusieurs notes par prospect, chacune avec son auteur et sa date

-- Table des notes de prospect
CREATE TABLE IF NOT EXISTS prospect_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  parent_id UUID REFERENCES prospect_notes(id) ON DELETE CASCADE, -- Pour les réponses
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_prospect_notes_prospect_id ON prospect_notes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_notes_organization_id ON prospect_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_prospect_notes_created_at ON prospect_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_notes_parent_id ON prospect_notes(parent_id);

-- Enable RLS
ALTER TABLE prospect_notes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view notes in their organization"
  ON prospect_notes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes in their organization"
  ON prospect_notes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notes"
  ON prospect_notes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own notes"
  ON prospect_notes FOR DELETE
  USING (created_by = auth.uid());

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_prospect_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prospect_notes_updated_at
  BEFORE UPDATE ON prospect_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_prospect_notes_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE prospect_notes;
