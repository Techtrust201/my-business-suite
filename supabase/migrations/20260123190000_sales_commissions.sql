-- Sales Commissions System

-- Commission rules configuration table
CREATE TABLE IF NOT EXISTS public.commission_rules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    -- Rule type
    rule_type text NOT NULL CHECK (rule_type IN ('percentage', 'fixed', 'tiered', 'bonus')),
    -- Basic commission rate
    base_percentage numeric DEFAULT 0, -- e.g., 5 for 5%
    fixed_amount numeric DEFAULT 0, -- Fixed amount per invoice
    -- Tiered commission (stored as JSONB)
    -- e.g., [{"min": 0, "max": 10000, "rate": 3}, {"min": 10000, "max": 50000, "rate": 5}]
    tiers jsonb,
    -- Conditions
    min_invoice_amount numeric, -- Minimum invoice amount to qualify
    min_monthly_target numeric, -- Minimum monthly target to qualify
    -- Bonus conditions
    bonus_percentage numeric DEFAULT 0, -- Additional bonus if targets met
    bonus_threshold_amount numeric, -- Amount threshold for bonus
    -- Applies to
    applies_to_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Specific user (null = all)
    applies_to_role_id uuid REFERENCES public.organization_roles(id) ON DELETE SET NULL, -- Specific role
    -- Active state
    is_active boolean DEFAULT TRUE,
    priority integer DEFAULT 0, -- Higher priority rules applied first
    -- Timestamps
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_commission_rules_org_id ON public.commission_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_user_id ON public.commission_rules(applies_to_user_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON public.commission_rules(is_active);

-- Enable RLS
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Organizations can view their commission rules." ON public.commission_rules
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Organization admins can manage commission rules." ON public.commission_rules
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations_with_role('admin')))
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations_with_role('admin')));

-- Calculated commissions table (stores actual commission records)
CREATE TABLE IF NOT EXISTS public.commissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Commercial who earned
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    commission_rule_id uuid REFERENCES public.commission_rules(id) ON DELETE SET NULL,
    -- Commission details
    invoice_amount numeric NOT NULL, -- Invoice HT amount
    commission_percentage numeric NOT NULL, -- Applied percentage
    commission_amount numeric NOT NULL, -- Calculated commission amount
    bonus_amount numeric DEFAULT 0, -- Any bonus added
    total_amount numeric NOT NULL, -- Total commission (commission_amount + bonus_amount)
    -- Status
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    approved_at timestamp with time zone,
    approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    paid_at timestamp with time zone,
    payment_reference text, -- Bank transfer reference, etc.
    -- Period tracking
    period_month integer NOT NULL, -- Month (1-12)
    period_year integer NOT NULL, -- Year
    -- Notes
    notes text,
    -- Timestamps
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    -- Prevent duplicate commissions for same invoice/user
    UNIQUE (invoice_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_commissions_org_id ON public.commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_invoice_id ON public.commissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON public.commissions(period_year, period_month);

-- Enable RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can see their own commissions, admins can see all
CREATE POLICY "Users can view their own commissions." ON public.commissions
    FOR SELECT USING (
        user_id = auth.uid() 
        OR organization_id IN (SELECT public.get_user_organizations_with_role('admin'))
    );

CREATE POLICY "Organization admins can manage commissions." ON public.commissions
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations_with_role('admin')))
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations_with_role('admin')));

-- Commission targets table (monthly/quarterly targets for users)
CREATE TABLE IF NOT EXISTS public.commission_targets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Target period
    target_type text NOT NULL CHECK (target_type IN ('monthly', 'quarterly', 'yearly')),
    period_month integer, -- For monthly targets (1-12)
    period_quarter integer, -- For quarterly targets (1-4)
    period_year integer NOT NULL,
    -- Target amounts
    target_amount numeric NOT NULL, -- Target revenue
    achieved_amount numeric DEFAULT 0, -- Achieved so far
    -- Bonus
    bonus_threshold_percent numeric DEFAULT 100, -- Percentage of target to achieve bonus
    bonus_amount numeric DEFAULT 0, -- Bonus if target achieved
    -- Timestamps
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    -- One target per user per period
    UNIQUE (user_id, target_type, period_year, COALESCE(period_month, 0), COALESCE(period_quarter, 0))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_commission_targets_org_id ON public.commission_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_targets_user_id ON public.commission_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_targets_period ON public.commission_targets(period_year, period_month, period_quarter);

-- Enable RLS
ALTER TABLE public.commission_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own targets." ON public.commission_targets
    FOR SELECT USING (
        user_id = auth.uid() 
        OR organization_id IN (SELECT public.get_user_organizations_with_role('admin'))
    );

CREATE POLICY "Organization admins can manage targets." ON public.commission_targets
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations_with_role('admin')))
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations_with_role('admin')));

-- Enable realtime for commissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.commissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_targets;

-- Triggers for updated_at
CREATE TRIGGER update_commission_rules_updated_at
    BEFORE UPDATE ON public.commission_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
    BEFORE UPDATE ON public.commissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_targets_updated_at
    BEFORE UPDATE ON public.commission_targets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate commission for an invoice
CREATE OR REPLACE FUNCTION public.calculate_invoice_commission(
    p_invoice_id uuid,
    p_user_id uuid
)
RETURNS TABLE (
    commission_percentage numeric,
    commission_amount numeric,
    bonus_amount numeric,
    total_amount numeric,
    rule_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invoice RECORD;
    v_rule RECORD;
    v_commission_pct numeric := 0;
    v_commission_amt numeric := 0;
    v_bonus_amt numeric := 0;
    v_total_amt numeric := 0;
    v_rule_id uuid;
    v_tier RECORD;
    v_remaining numeric;
    v_tier_commission numeric;
BEGIN
    -- Get invoice details
    SELECT i.*, i.total_ht as invoice_amount
    INTO v_invoice
    FROM public.invoices i
    WHERE i.id = p_invoice_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Find applicable commission rule
    SELECT *
    INTO v_rule
    FROM public.commission_rules cr
    WHERE cr.organization_id = v_invoice.organization_id
      AND cr.is_active = TRUE
      AND (cr.applies_to_user_id IS NULL OR cr.applies_to_user_id = p_user_id)
      AND (cr.min_invoice_amount IS NULL OR v_invoice.invoice_amount >= cr.min_invoice_amount)
    ORDER BY 
        CASE WHEN cr.applies_to_user_id IS NOT NULL THEN 1 ELSE 2 END, -- User-specific first
        cr.priority DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- No rule found, return zero commission
        commission_percentage := 0;
        commission_amount := 0;
        bonus_amount := 0;
        total_amount := 0;
        rule_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;
    
    v_rule_id := v_rule.id;
    
    -- Calculate commission based on rule type
    IF v_rule.rule_type = 'percentage' THEN
        v_commission_pct := v_rule.base_percentage;
        v_commission_amt := ROUND((v_invoice.invoice_amount * v_rule.base_percentage / 100)::numeric, 2);
        
    ELSIF v_rule.rule_type = 'fixed' THEN
        v_commission_pct := 0;
        v_commission_amt := v_rule.fixed_amount;
        
    ELSIF v_rule.rule_type = 'tiered' AND v_rule.tiers IS NOT NULL THEN
        -- Calculate tiered commission
        v_remaining := v_invoice.invoice_amount;
        v_commission_amt := 0;
        
        FOR v_tier IN SELECT * FROM jsonb_to_recordset(v_rule.tiers) AS x(min numeric, max numeric, rate numeric)
        ORDER BY x.min ASC
        LOOP
            IF v_remaining <= 0 THEN
                EXIT;
            END IF;
            
            IF v_invoice.invoice_amount > v_tier.min THEN
                v_tier_commission := LEAST(v_remaining, COALESCE(v_tier.max, v_invoice.invoice_amount) - v_tier.min);
                v_commission_amt := v_commission_amt + ROUND((v_tier_commission * v_tier.rate / 100)::numeric, 2);
                v_remaining := v_remaining - v_tier_commission;
            END IF;
        END LOOP;
        
        -- Calculate effective percentage
        IF v_invoice.invoice_amount > 0 THEN
            v_commission_pct := ROUND((v_commission_amt / v_invoice.invoice_amount * 100)::numeric, 2);
        END IF;
    END IF;
    
    -- Calculate bonus if applicable
    IF v_rule.bonus_percentage > 0 AND v_rule.bonus_threshold_amount IS NOT NULL THEN
        IF v_invoice.invoice_amount >= v_rule.bonus_threshold_amount THEN
            v_bonus_amt := ROUND((v_invoice.invoice_amount * v_rule.bonus_percentage / 100)::numeric, 2);
        END IF;
    END IF;
    
    v_total_amt := v_commission_amt + v_bonus_amt;
    
    -- Return results
    commission_percentage := v_commission_pct;
    commission_amount := v_commission_amt;
    bonus_amount := v_bonus_amt;
    total_amount := v_total_amt;
    rule_id := v_rule_id;
    
    RETURN NEXT;
END;
$$;

-- Add created_by to invoices if not exists (to track who created/is responsible)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS salesperson_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
