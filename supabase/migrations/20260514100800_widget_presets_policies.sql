-- =============================================
-- N18 — widget_presets accessible publiquement
-- =============================================
-- Avant : USING (TRUE) ouvrait la table en lecture a anon. Pas critique
-- (donnees pas sensibles, juste les noms / configs de widgets par defaut)
-- mais incoherent avec le modele "tout est scoped a l'organisation ou
-- authentifie".
--
-- Apres : SELECT reserve aux authenticated. Les presets globaux
-- (organization_id IS NULL) restent visibles par tous les utilisateurs
-- authentifies, et chaque org peut voir/ajouter ses propres presets.
-- =============================================

DROP POLICY IF EXISTS "Anyone can view widget presets." ON public.widget_presets;

CREATE POLICY "Authenticated can view widget presets" ON public.widget_presets
    FOR SELECT
    TO authenticated
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );
