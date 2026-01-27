import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

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
  is_template: boolean;
  is_system: boolean;
  permissions: RolePermissions;
  dashboard_config: any;
  created_at: string;
  updated_at: string;
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
    mutationFn: async (role: Omit<CustomRole, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('custom_roles')
        .insert({
          ...role,
          organization_id: organization.id,
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
    onError: (error: any) => {
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
    mutationFn: async ({ id, ...updates }: Partial<CustomRole> & { id: string }) => {
      const { data, error } = await supabase
        .from('custom_roles')
        .update(updates)
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
export function useInitDefaultRoles() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error('No organization');

      const { error } = await supabase.rpc('create_default_roles_for_org', {
        org_id: organization.id,
      });

      if (error) throw error;
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
