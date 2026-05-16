
-- 1. Invitations: remove overly permissive SELECT policy (token IS NOT NULL).
-- Token-based lookups already go through SECURITY DEFINER RPC get_invitation_by_token.
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;

-- 2. Bank accounts: remove duplicate non-admin write policies (OR-merge bypassed admin check).
DROP POLICY IF EXISTS "Users can insert bank accounts for their organization" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update bank accounts of their organization" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete bank accounts of their organization" ON public.bank_accounts;
-- Keep redundant SELECT "Users can view bank accounts of their organization" — same scope as admin ALL's SELECT for org members.

-- 3. Audit logs: tighten INSERT policy to enforce identity + organization.
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND organization_id = public.get_user_organization_id()
);
