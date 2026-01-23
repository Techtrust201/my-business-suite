-- Dashboard widgets configuration

-- Create dashboard_configs table for storing user dashboard configurations
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    -- Dashboard type (main, commercial, finance, custom)
    dashboard_type text NOT NULL DEFAULT 'main',
    -- Widget layout (stored as JSONB)
    -- Format: [{ id: "widget-1", type: "revenue", x: 0, y: 0, w: 4, h: 2, config: {...} }]
    widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- Meta
    is_active boolean DEFAULT TRUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    -- One config per user per dashboard type
    UNIQUE (user_id, organization_id, dashboard_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON public.dashboard_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_org_id ON public.dashboard_configs(organization_id);

-- Enable RLS
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage their own dashboard configs
CREATE POLICY "Users can view their own dashboard configs." ON public.dashboard_configs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own dashboard configs." ON public.dashboard_configs
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own dashboard configs." ON public.dashboard_configs
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own dashboard configs." ON public.dashboard_configs
    FOR DELETE USING (user_id = auth.uid());

-- Admins can manage anyone's dashboard (for customization by super admin)
CREATE POLICY "Admins can manage all dashboard configs." ON public.dashboard_configs
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations_with_role('admin')))
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations_with_role('admin')));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_configs;

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_configs_updated_at
    BEFORE UPDATE ON public.dashboard_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Widget presets/templates
CREATE TABLE IF NOT EXISTS public.widget_presets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL for global presets
    name text NOT NULL,
    description text,
    widget_type text NOT NULL,
    default_config jsonb DEFAULT '{}'::jsonb,
    default_size jsonb DEFAULT '{"w": 4, "h": 2}'::jsonb,
    is_active boolean DEFAULT TRUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert default widget presets
INSERT INTO public.widget_presets (name, description, widget_type, default_config, default_size) VALUES
    ('Chiffre d''affaires', 'CA du mois en cours', 'revenue', '{"period": "month"}', '{"w": 3, "h": 2}'),
    ('Factures impayées', 'Montant des factures en attente', 'unpaid_invoices', '{}', '{"w": 3, "h": 2}'),
    ('Devis en cours', 'Nombre de devis en attente', 'pending_quotes', '{}', '{"w": 3, "h": 2}'),
    ('Nouveaux clients', 'Clients ajoutés ce mois', 'new_clients', '{"period": "month"}', '{"w": 3, "h": 2}'),
    ('Graphique CA', 'Évolution du CA sur 12 mois', 'revenue_chart', '{"months": 12}', '{"w": 6, "h": 3}'),
    ('KPIs Prospects', 'Statistiques par source', 'prospect_kpis', '{}', '{"w": 6, "h": 4}'),
    ('CA par canal', 'Répartition du CA par canal', 'revenue_by_channel', '{}', '{"w": 6, "h": 3}'),
    ('Activité récente', 'Dernières activités', 'activity_feed', '{"limit": 10}', '{"w": 4, "h": 4}'),
    ('Tâches à faire', 'Rappels et tâches', 'reminders', '{}', '{"w": 4, "h": 3}'),
    ('Funnel conversion', 'Entonnoir de conversion prospects', 'conversion_funnel', '{}', '{"w": 4, "h": 3}')
ON CONFLICT DO NOTHING;

-- Enable RLS for widget_presets
ALTER TABLE public.widget_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view widget presets." ON public.widget_presets
    FOR SELECT USING (TRUE);
