-- Trigger pour remplir automatiquement created_by sur les écritures comptables
CREATE OR REPLACE FUNCTION public.set_journal_entry_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger si pas déjà existant
DROP TRIGGER IF EXISTS trigger_set_journal_entry_created_by ON public.journal_entries;
CREATE TRIGGER trigger_set_journal_entry_created_by
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_journal_entry_created_by();