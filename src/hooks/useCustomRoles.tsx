import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface Permission {
  view_prospects?: boolean;
  create_prospects?: boolean;
  edit_prospects?: boolean;
  delete_prospects?: boolean;
  view_all_prospects?: boolean;
  send_emails?: boolean;
  assign_prospects?: boolean;
}

export interface SalesPermission {
  view_quotes?: boolean;
  create_quotes?: boolean;
  edit_quotes?: boolean;
  view_invoices?: boolean;
  create_invoices?: boolean;
  edit_invoices?: boolean;
  view_margins?: boolean;
}

export interface FinancePermission {
  view_accounting?: boolean;
  view_expenses?: boolean;
  create_expenses?: boolean;
  view_bank?: boolean;
  view_reports?: boolean;
}

export interface AdminPermission {
  manage_users?: boolean;
  manage_settings?: boolean;
  manage_commissions?: boolean;
  manage_roles?: boolean;
}

export interface RolePermissions {
  crm?: Permission;
  sales?: SalesPermission;
  finance?: FinancePermission;
  admin?: AdminPermission;
  dashboard_type?: 'full' | 'commercial' | 'finance' | 'readonly';
}

export interface CustomRole {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_template: boolean | null;
  is_system: boolean | null;
  permissions: Json;
  dashboard_config: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useCustomRoles() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['custom-roles', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) {
        console.error('Error fetching custom roles:', error);
        return [];
      }

      return data as CustomRole[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateCustomRole() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (role: { name: string; description?: string; is_template?: boolean; is_system?: boolean; permissions?: RolePermissions; dashboard_config?: unknown }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('custom_roles')
        .insert({
          organization_id: organization.id,
          name: role.name,
          description: role.description,
          is_template: role.is_template,
          is_system: role.is_system,
          permissions: role.permissions as unknown as Json,
          dashboard_config: role.dashboard_config as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Rôle créé avec succès');
    },
    onError: (error: Error & { code?: string }) => {
      console.error('Error creating role:', error);
      if (error.code === '23505') {
        toast.error('Un rôle avec ce nom existe déjà');
      } else {
        toast.error('Erreur lors de la création du rôle');
      }
    },
  });
}

export function useUpdateCustomRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; is_template?: boolean; is_system?: boolean; permissions?: RolePermissions; dashboard_config?: unknown }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.is_template !== undefined) updateData.is_template = updates.is_template;
      if (updates.is_system !== undefined) updateData.is_system = updates.is_system;
      if (updates.permissions !== undefined) updateData.permissions = updates.permissions as unknown as Json;
      if (updates.dashboard_config !== undefined) updateData.dashboard_config = updates.dashboard_config as unknown as Json;

      const { data, error } = await supabase
        .from('custom_roles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Rôle mis à jour');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

export function useDeleteCustomRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Rôle supprimé');
    },
    onError: (error) => {
      console.error('Error deleting role:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}

export function useAssignRoleToUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, customRoleId }: { userId: string; customRoleId: string | null }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .update({ custom_role_id: customRoleId })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-permissions'] });
      toast.success('Rôle attribué');
    },
    onError: (error) => {
      console.error('Error assigning role:', error);
      toast.error('Erreur lors de l\'attribution du rôle');
    },
  });
}

// Hook pour initialiser les rôles par défaut
// Note: create_default_roles_for_org RPC function needs to be created in the database
export function useInitDefaultRoles() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error('No organization');

      // TODO: Create the create_default_roles_for_org RPC function in the database
      // For now, we'll create default roles manually
      const defaultRoles = [
        {
          organization_id: organization.id,
          name: 'Commercial',
          description: 'Accès aux fonctionnalités de vente et CRM',
          is_template: false,
          is_system: true,
          permissions: {
            crm: { view_prospects: true, create_prospects: true, edit_prospects: true },
            sales: { view_quotes: true, create_quotes: true, view_invoices: true },
            dashboard_type: 'commercial',
          } as unknown as Json,
        },
        {
          organization_id: organization.id,
          name: 'Comptable',
          description: 'Accès aux fonctionnalités comptables',
          is_template: false,
          is_system: true,
          permissions: {
            finance: { view_accounting: true, view_expenses: true, view_bank: true, view_reports: true },
            dashboard_type: 'finance',
          } as unknown as Json,
        },
      ];

      for (const role of defaultRoles) {
        const { error } = await supabase
          .from('custom_roles')
          .insert(role);
        
        // Ignore duplicate key errors
        if (error && error.code !== '23505') {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Rôles par défaut créés');
    },
    onError: (error) => {
      console.error('Error creating default roles:', error);
      toast.error('Erreur lors de la création des rôles par défaut');
    },
  });
}
