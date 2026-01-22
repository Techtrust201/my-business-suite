import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export interface OrganizationUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: 'admin' | 'readonly';
  permissions: Record<string, boolean>;
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

      // Fetch roles for these users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('organization_id', organization.id);

      if (rolesError) throw rolesError;

      // Combine data
      const users: OrganizationUser[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRole?.role as 'admin' | 'readonly') || 'readonly',
          permissions: {
            can_view_margins: userRole?.role === 'admin',
            can_manage_prospects: true,
            can_create_invoices: userRole?.role === 'admin',
            can_manage_users: userRole?.role === 'admin',
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

      // Update or insert role
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          organization_id: organization.id,
          role,
        }, {
          onConflict: 'user_id,organization_id,role',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      toast.success('Rôle mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du rôle');
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
