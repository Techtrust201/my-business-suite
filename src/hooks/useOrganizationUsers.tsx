import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export interface UserPermissions {
  can_view_margins: boolean;
  can_manage_prospects: boolean;
  can_send_emails: boolean;
  can_view_dashboard: boolean;
  can_create_invoices: boolean;
  can_manage_users: boolean;
}

export interface OrganizationUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: 'admin' | 'readonly';
  permissions: UserPermissions;
}

const MAX_USERS = 4;

export function useOrganizationUsers() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['organization-users', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Fetch profiles for this organization
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url, created_at')
        .eq('organization_id', organization.id);

      if (profilesError) throw profilesError;

      // Fetch roles with granular permissions for these users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, can_manage_prospects, can_send_emails, can_view_dashboard')
        .eq('organization_id', organization.id);

      if (rolesError) throw rolesError;

      // Combine data
      const users: OrganizationUser[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const isAdmin = userRole?.role === 'admin';
        
        return {
          ...profile,
          role: (userRole?.role as 'admin' | 'readonly') || 'readonly',
          permissions: {
            can_view_margins: isAdmin,
            can_manage_prospects: userRole?.can_manage_prospects ?? true,
            can_send_emails: userRole?.can_send_emails ?? true,
            can_view_dashboard: userRole?.can_view_dashboard ?? true,
            can_create_invoices: isAdmin,
            can_manage_users: isAdmin,
          },
        };
      });

      return users;
    },
    enabled: !!organization?.id,
  });
}

export function useUserCount() {
  const { data: users } = useOrganizationUsers();
  return {
    count: users?.length || 0,
    max: MAX_USERS,
    canAddMore: (users?.length || 0) < MAX_USERS,
  };
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'readonly' }) => {
      if (!organization?.id) throw new Error('No organization');

      // First check if a role entry exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId)
          .eq('organization_id', organization.id);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            organization_id: organization.id,
            role,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-permissions'] });
      toast.success('Rôle mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du rôle');
      console.error(error);
    },
  });
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      permissions 
    }: { 
      userId: string; 
      permissions: Partial<Pick<UserPermissions, 'can_manage_prospects' | 'can_send_emails' | 'can_view_dashboard'>>
    }) => {
      if (!organization?.id) throw new Error('No organization');

      // First check if a role entry exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role with new permissions
        const { error } = await supabase
          .from('user_roles')
          .update(permissions)
          .eq('user_id', userId)
          .eq('organization_id', organization.id);
        if (error) throw error;
      } else {
        // Insert new role with permissions
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            organization_id: organization.id,
            role: 'readonly',
            ...permissions,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-permissions'] });
      toast.success('Permissions mises à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour des permissions');
      console.error(error);
    },
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!organization?.id) throw new Error('No organization');

      // Remove user from organization (set organization_id to null)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', userId)
        .eq('organization_id', organization.id);

      if (profileError) throw profileError;

      // Remove user roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organization.id);

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('Utilisateur retiré de l\'organisation');
    },
    onError: (error) => {
      toast.error('Erreur lors du retrait de l\'utilisateur');
      console.error(error);
    },
  });
}
