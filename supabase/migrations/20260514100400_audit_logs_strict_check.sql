-- =============================================
-- N11 — audit_logs INSERT trop permissif
-- =============================================
-- Avant : WITH CHECK (auth.uid() IS NOT NULL) — n'importe quel
-- utilisateur authentifie pouvait forger des lignes d'audit pour
-- n'importe quelle organisation, salissant le journal.
--
-- Apres : INSERT scoped a l'organisation de l'appelant via user_roles.
-- Les Edge Functions utilisant le service_role bypassent la RLS de
-- toute facon (cf. admin-reset-password) et continuent donc a logger.
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Audit logs insert scoped to org" ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.user_roles
            WHERE user_id = auth.uid()
        )
    );
