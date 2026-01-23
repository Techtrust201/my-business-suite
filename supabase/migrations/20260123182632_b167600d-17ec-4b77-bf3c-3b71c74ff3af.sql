-- Ajouter prospect_statuses à la publication realtime pour le funnel
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospect_statuses;

-- Table des notes de prospection avec traçabilité
CREATE TABLE IF NOT EXISTS public.prospect_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_prospect_notes_prospect_id ON public.prospect_notes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_notes_organization_id ON public.prospect_notes(organization_id);

-- Activer RLS
ALTER TABLE public.prospect_notes ENABLE ROW LEVEL SECURITY;

-- Policies RLS pour notes
CREATE POLICY "Users can view their organization prospect notes"
  ON public.prospect_notes FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert prospect notes for their organization"
  ON public.prospect_notes FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their own prospect notes"
  ON public.prospect_notes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own prospect notes"
  ON public.prospect_notes FOR DELETE
  USING (created_by = auth.uid());

-- Table des rappels
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  reminder_date DATE NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_reminders_organization_id ON public.reminders(organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_date ON public.reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_entity ON public.reminders(entity_type, entity_id);

-- Activer RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policies RLS pour rappels
CREATE POLICY "Users can view their organization reminders"
  ON public.reminders FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert reminders for their organization"
  ON public.reminders FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization reminders"
  ON public.reminders FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization reminders"
  ON public.reminders FOR DELETE
  USING (organization_id = get_user_organization_id());