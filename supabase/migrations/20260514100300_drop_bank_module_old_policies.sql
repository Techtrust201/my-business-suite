-- =============================================
-- N8 — DROP des policies dupliquees sur bank_accounts
-- =============================================
-- Avant : les policies "Users can ..." de 20260110050946 et 20260110051836
-- co-existaient avec les policies "Organization admins can manage" de
-- 20260123210000. RLS etant permissif, c'etait un OU logique : un non-admin
-- gardait INSERT/UPDATE/DELETE malgre l'intention "admins seulement".
--
-- Apres : on garde uniquement les policies "admin only" sur bank_accounts.
-- Pour bank_transactions on dedoublonne les policies a l'identique
-- (l'intention reste : tout membre de l'org peut gerer les transactions).
-- =============================================

-- bank_accounts : on degage tous les anciens policies trop permissifs.
DROP POLICY IF EXISTS "Users can view bank accounts of their organization" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert bank accounts for their organization" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update bank accounts of their organization" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete bank accounts of their organization" ON public.bank_accounts;

-- Sanite : si les policies "Organizations can view ..." / "Organization admins can manage ..."
-- n'existent pas (selon l'historique applique en prod), on les recree
-- (idempotent grace au IF NOT EXISTS via DROP+CREATE).
DROP POLICY IF EXISTS "Organizations can view their bank accounts." ON public.bank_accounts;
CREATE POLICY "Organizations can view their bank accounts." ON public.bank_accounts
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_organizations()));

DROP POLICY IF EXISTS "Organization admins can manage bank accounts." ON public.bank_accounts;
CREATE POLICY "Organization admins can manage bank accounts." ON public.bank_accounts
    FOR ALL
    USING (organization_id IN (SELECT public.get_user_organizations_with_role('admin')))
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations_with_role('admin')));

-- bank_transactions : suppression des doublons identiques entre les deux
-- migrations historiques (les noms etant identiques, le DROP ne perdra
-- rien d'utile et l'on recree la policy attendue).
DROP POLICY IF EXISTS "Users can view bank transactions of their organization" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can insert bank transactions for their organization" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can update bank transactions of their organization" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can delete bank transactions of their organization" ON public.bank_transactions;

CREATE POLICY "Org members can view bank transactions" ON public.bank_transactions
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Org members can insert bank transactions" ON public.bank_transactions
    FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Org members can update bank transactions" ON public.bank_transactions
    FOR UPDATE
    USING (organization_id IN (SELECT public.get_user_organizations()))
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Org members can delete bank transactions" ON public.bank_transactions
    FOR DELETE
    USING (organization_id IN (SELECT public.get_user_organizations()));
