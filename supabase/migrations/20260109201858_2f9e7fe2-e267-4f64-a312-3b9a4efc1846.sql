-- Supprimer l'ancienne contrainte FK vers items
ALTER TABLE public.quote_lines
DROP CONSTRAINT IF EXISTS quote_lines_item_id_fkey;

-- Ajouter la nouvelle contrainte FK vers articles
ALTER TABLE public.quote_lines
ADD CONSTRAINT quote_lines_item_id_fkey
FOREIGN KEY (item_id) REFERENCES public.articles(id) ON DELETE SET NULL;