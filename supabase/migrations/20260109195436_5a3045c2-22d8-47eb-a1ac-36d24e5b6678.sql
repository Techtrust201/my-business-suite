-- Insert sample articles for the user's organization
-- Services
INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Développement web',
  'Développement d''applications web sur mesure avec technologies modernes (React, Node.js, etc.)',
  'DEV-001',
  650.00,
  'jour',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'service',
  'Développement',
  true
WHERE get_user_organization_id() IS NOT NULL;

INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Maintenance applicative',
  'Support technique et maintenance corrective/évolutive de sites et applications',
  'MAINT-001',
  450.00,
  'jour',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'service',
  'Maintenance',
  true
WHERE get_user_organization_id() IS NOT NULL;

INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Formation utilisateurs',
  'Formation sur mesure à l''utilisation des outils et logiciels',
  'FORM-001',
  800.00,
  'jour',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'service',
  'Formation',
  true
WHERE get_user_organization_id() IS NOT NULL;

INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Conseil technique',
  'Consulting et expertise technique pour vos projets digitaux',
  'CONS-001',
  750.00,
  'jour',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'service',
  'Conseil',
  true
WHERE get_user_organization_id() IS NOT NULL;

INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Intégration API',
  'Développement d''intégrations avec des services tiers (paiement, CRM, etc.)',
  'API-001',
  600.00,
  'jour',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'service',
  'Développement',
  true
WHERE get_user_organization_id() IS NOT NULL;

INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Audit de sécurité',
  'Analyse complète de la sécurité de votre application avec rapport détaillé',
  'AUDIT-001',
  1200.00,
  'forfait',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'service',
  'Sécurité',
  true
WHERE get_user_organization_id() IS NOT NULL;

-- Products
INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Licence logicielle',
  'Licence annuelle d''utilisation de nos solutions logicielles',
  'LIC-001',
  299.00,
  'licence',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'product',
  'Licences',
  true
WHERE get_user_organization_id() IS NOT NULL;

INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Hébergement web',
  'Hébergement web mutualisé haute performance avec SSL inclus',
  'HEB-001',
  29.90,
  'mois',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'product',
  'Infrastructure',
  true
WHERE get_user_organization_id() IS NOT NULL;

INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Nom de domaine',
  'Enregistrement ou renouvellement de nom de domaine (.fr, .com, etc.)',
  'DOM-001',
  15.00,
  'an',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'product',
  'Infrastructure',
  true
WHERE get_user_organization_id() IS NOT NULL;

INSERT INTO public.articles (organization_id, name, description, reference, unit_price, unit, tax_rate_id, type, category, is_active)
SELECT 
  get_user_organization_id(),
  'Certificat SSL',
  'Certificat de sécurité SSL/TLS pour sécuriser votre site web',
  'SSL-001',
  49.00,
  'an',
  (SELECT id FROM tax_rates WHERE organization_id = get_user_organization_id() AND is_default = true LIMIT 1),
  'product',
  'Sécurité',
  true
WHERE get_user_organization_id() IS NOT NULL;