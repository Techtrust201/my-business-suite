-- Create expense category enum
CREATE TYPE public.expense_category AS ENUM (
  'restauration',
  'transport',
  'fournitures',
  'telecom',
  'abonnements',
  'frais_bancaires',
  'hebergement',
  'marketing',
  'formation',
  'autre'
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  category public.expense_category DEFAULT 'autre',
  vendor_name TEXT,
  receipt_url TEXT,
  payment_method public.payment_method DEFAULT 'card',
  matched_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  notes TEXT,
  is_reimbursable BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view expenses from their organization"
ON public.expenses FOR SELECT
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can create expenses in their organization"
ON public.expenses FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update expenses in their organization"
ON public.expenses FOR UPDATE
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete expenses from their organization"
ON public.expenses FOR DELETE
USING (organization_id = public.get_user_organization_id());

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true);

-- Storage policies for receipts bucket
CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();