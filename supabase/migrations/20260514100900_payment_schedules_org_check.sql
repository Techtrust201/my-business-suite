-- =============================================
-- N19 — invoice_payment_schedules cross-check organization_id
-- =============================================
-- Avant : on verifiait que `schedules.organization_id` correspondait a
-- l'organisation du user, mais on n'imposait pas que `schedules.invoice_id`
-- pointe bien vers une invoice de la meme organisation. Un attaquant
-- pouvait creer / modifier des schedules pointant vers des invoices
-- d'autres organisations en utilisant son propre organization_id.
--
-- Apres : USING / WITH CHECK incluent un EXISTS qui force l'invoice
-- referencee a appartenir a la meme organisation.
-- =============================================

DROP POLICY IF EXISTS "Users can view their organization schedule" ON public.invoice_payment_schedules;
DROP POLICY IF EXISTS "Users can insert schedule for their organization" ON public.invoice_payment_schedules;
DROP POLICY IF EXISTS "Users can update their organization schedule" ON public.invoice_payment_schedules;
DROP POLICY IF EXISTS "Users can delete their organization schedule" ON public.invoice_payment_schedules;

CREATE POLICY "Payment schedules SELECT scoped" ON public.invoice_payment_schedules
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.organization_id = invoice_payment_schedules.organization_id
    )
  );

CREATE POLICY "Payment schedules INSERT scoped" ON public.invoice_payment_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.organization_id = invoice_payment_schedules.organization_id
    )
  );

CREATE POLICY "Payment schedules UPDATE scoped" ON public.invoice_payment_schedules
  FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.organization_id = invoice_payment_schedules.organization_id
    )
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.organization_id = invoice_payment_schedules.organization_id
    )
  );

CREATE POLICY "Payment schedules DELETE scoped" ON public.invoice_payment_schedules
  FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id
        AND i.organization_id = invoice_payment_schedules.organization_id
    )
  );
