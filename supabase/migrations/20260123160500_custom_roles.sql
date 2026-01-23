-- Migration pour les rôles personnalisés avec permissions granulaires
-- Permet au super admin de créer des rôles avec des permissions spécifiques

-- Table des rôles personnalisés
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_template BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false, -- Rôles système non modifiables (super_admin)
  permissions JSONB NOT NULL DEFAULT '{}',
  dashboard_config JSONB DEFAULT '{}', -- Configuration du dashboard pour ce rôle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Ajouter la colonne custom_role_id à user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_custom_roles_organization_id ON custom_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_custom_role_id ON user_roles(custom_role_id);

-- Enable RLS
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

-- Policies pour custom_roles
CREATE POLICY "Users can view roles in their organization"
  ON custom_roles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage roles"
  ON custom_roles FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_roles_updated_at();

-- Table pour les configurations de dashboard par utilisateur
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  custom_role_id UUID REFERENCES custom_roles(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '[]', -- Configuration react-grid-layout
  widgets JSONB NOT NULL DEFAULT '[]', -- Liste des widgets actifs avec leurs configs
  is_default_for_role BOOLEAN DEFAULT false, -- Layout par défaut pour un rôle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Soit user_id soit custom_role_id doit être défini
  CONSTRAINT dashboard_config_target CHECK (
    (user_id IS NOT NULL AND custom_role_id IS NULL) OR
    (user_id IS NULL AND custom_role_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user_id ON dashboard_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_role_id ON dashboard_configs(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_organization_id ON dashboard_configs(organization_id);

-- Enable RLS pour dashboard_configs
ALTER TABLE dashboard_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dashboard config"
  ON dashboard_configs FOR SELECT
  USING (
    user_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own dashboard config"
  ON dashboard_configs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own dashboard config"
  ON dashboard_configs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all dashboard configs"
  ON dashboard_configs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger pour updated_at sur dashboard_configs
CREATE TRIGGER dashboard_configs_updated_at
  BEFORE UPDATE ON dashboard_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_roles_updated_at();

-- Fonction pour créer les rôles par défaut pour une organisation
CREATE OR REPLACE FUNCTION create_default_roles_for_org(org_id UUID)
RETURNS void AS $$
BEGIN
  -- Super Admin (template)
  INSERT INTO custom_roles (organization_id, name, description, is_template, is_system, permissions, dashboard_config)
  VALUES (
    org_id,
    'Super Admin',
    'Accès complet à toutes les fonctionnalités',
    true,
    true,
    '{
      "crm": {"view_prospects": true, "create_prospects": true, "edit_prospects": true, "delete_prospects": true, "view_all_prospects": true, "send_emails": true, "assign_prospects": true},
      "sales": {"view_quotes": true, "create_quotes": true, "edit_quotes": true, "view_invoices": true, "create_invoices": true, "edit_invoices": true, "view_margins": true},
      "finance": {"view_accounting": true, "view_expenses": true, "create_expenses": true, "view_bank": true, "view_reports": true},
      "admin": {"manage_users": true, "manage_settings": true, "manage_commissions": true, "manage_roles": true},
      "dashboard_type": "full"
    }'::jsonb,
    '{"type": "full"}'::jsonb
  ) ON CONFLICT (organization_id, name) DO NOTHING;

  -- Commercial
  INSERT INTO custom_roles (organization_id, name, description, is_template, permissions, dashboard_config)
  VALUES (
    org_id,
    'Commercial',
    'Accès CRM, devis et factures',
    true,
    '{
      "crm": {"view_prospects": true, "create_prospects": true, "edit_prospects": true, "delete_prospects": false, "view_all_prospects": false, "send_emails": true, "assign_prospects": false},
      "sales": {"view_quotes": true, "create_quotes": true, "edit_quotes": true, "view_invoices": true, "create_invoices": true, "edit_invoices": false, "view_margins": false},
      "finance": {"view_accounting": false, "view_expenses": false, "create_expenses": false, "view_bank": false, "view_reports": false},
      "admin": {"manage_users": false, "manage_settings": false, "manage_commissions": false, "manage_roles": false},
      "dashboard_type": "commercial"
    }'::jsonb,
    '{"type": "commercial"}'::jsonb
  ) ON CONFLICT (organization_id, name) DO NOTHING;

  -- Comptable
  INSERT INTO custom_roles (organization_id, name, description, is_template, permissions, dashboard_config)
  VALUES (
    org_id,
    'Comptable',
    'Accès comptabilité et finances',
    true,
    '{
      "crm": {"view_prospects": false, "create_prospects": false, "edit_prospects": false, "delete_prospects": false, "view_all_prospects": false, "send_emails": false, "assign_prospects": false},
      "sales": {"view_quotes": true, "create_quotes": false, "edit_quotes": false, "view_invoices": true, "create_invoices": false, "edit_invoices": false, "view_margins": true},
      "finance": {"view_accounting": true, "view_expenses": true, "create_expenses": true, "view_bank": true, "view_reports": true},
      "admin": {"manage_users": false, "manage_settings": false, "manage_commissions": false, "manage_roles": false},
      "dashboard_type": "finance"
    }'::jsonb,
    '{"type": "finance"}'::jsonb
  ) ON CONFLICT (organization_id, name) DO NOTHING;

  -- Lecture seule
  INSERT INTO custom_roles (organization_id, name, description, is_template, permissions, dashboard_config)
  VALUES (
    org_id,
    'Lecture seule',
    'Consultation uniquement, aucune modification',
    true,
    '{
      "crm": {"view_prospects": true, "create_prospects": false, "edit_prospects": false, "delete_prospects": false, "view_all_prospects": true, "send_emails": false, "assign_prospects": false},
      "sales": {"view_quotes": true, "create_quotes": false, "edit_quotes": false, "view_invoices": true, "create_invoices": false, "edit_invoices": false, "view_margins": false},
      "finance": {"view_accounting": true, "view_expenses": true, "create_expenses": false, "view_bank": true, "view_reports": true},
      "admin": {"manage_users": false, "manage_settings": false, "manage_commissions": false, "manage_roles": false},
      "dashboard_type": "readonly"
    }'::jsonb,
    '{"type": "readonly"}'::jsonb
  ) ON CONFLICT (organization_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE custom_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_configs;
