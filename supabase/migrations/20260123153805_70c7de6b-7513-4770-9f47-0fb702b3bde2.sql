-- 1. Nettoyer les doublons existants (garder le rôle admin si présent)
DELETE FROM user_roles a
USING user_roles b
WHERE a.user_id = b.user_id 
  AND a.organization_id = b.organization_id
  AND a.role = 'readonly'
  AND b.role = 'admin';

-- 2. Supprimer l'ancienne contrainte qui inclut 'role'
ALTER TABLE user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_organization_id_role_key;

-- 3. Créer la nouvelle contrainte UNIQUE sans 'role' 
-- Garantit UN SEUL rôle par utilisateur par organisation
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_organization_id_key 
UNIQUE (user_id, organization_id);