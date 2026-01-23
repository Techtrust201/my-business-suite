-- Create prospect_basket_items table for storing selected articles
CREATE TABLE IF NOT EXISTS public.prospect_basket_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
    quantity numeric NOT NULL DEFAULT 1,
    unit_price numeric, -- Override from article if needed
    notes text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (prospect_id, article_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prospect_basket_prospect_id ON public.prospect_basket_items(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_basket_organization_id ON public.prospect_basket_items(organization_id);

-- Enable RLS
ALTER TABLE public.prospect_basket_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Organizations can view their prospect basket items." ON public.prospect_basket_items
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Organization members can insert prospect basket items." ON public.prospect_basket_items
    FOR INSERT WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Organization members can update their prospect basket items." ON public.prospect_basket_items
    FOR UPDATE USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY "Organization members can delete their prospect basket items." ON public.prospect_basket_items
    FOR DELETE USING (organization_id IN (SELECT public.get_user_organizations()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospect_basket_items;

-- Create trigger for updated_at
CREATE TRIGGER update_prospect_basket_items_updated_at
    BEFORE UPDATE ON public.prospect_basket_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
