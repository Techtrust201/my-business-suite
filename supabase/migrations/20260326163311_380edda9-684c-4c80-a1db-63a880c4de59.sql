CREATE TABLE public.invoice_payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  percent NUMERIC,
  due_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization schedule"
  ON public.invoice_payment_schedules FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert schedule for their organization"
  ON public.invoice_payment_schedules FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization schedule"
  ON public.invoice_payment_schedules FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization schedule"
  ON public.invoice_payment_schedules FOR DELETE
  USING (organization_id = get_user_organization_id());

CREATE INDEX idx_invoice_payment_schedules_invoice_id ON public.invoice_payment_schedules(invoice_id);

CREATE TRIGGER update_invoice_payment_schedules_updated_at
  BEFORE UPDATE ON public.invoice_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();