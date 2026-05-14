-- =============================================
-- N20 — reminders SELECT par user_id, pas par organization_id
-- =============================================
-- Avant : USING (user_id = auth.uid() OR organization_id IN (
--   SELECT public.get_user_organizations())) → tous les membres d'une org
-- voyaient les rappels de leurs collegues (CRM personnel, suivi prive).
-- Apres : SELECT strictement scope a auth.uid().
-- INSERT/UPDATE/DELETE inchanges.
-- =============================================

DROP POLICY IF EXISTS "Users can view their own reminders or org reminders." ON public.reminders;

CREATE POLICY "Users can view their own reminders" ON public.reminders
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
