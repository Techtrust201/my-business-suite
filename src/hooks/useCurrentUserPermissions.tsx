import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';

export interface UserPermissions {
  canViewMargins: boolean;
  canCreateInvoices: boolean;
  canManageUsers: boolean;
  canManageProspects: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useCurrentUserPermissions(): UserPermissions {
  const { user } = useAuth();
  const { organization } = useOrganization();

  const { data: role, isLoading } = useQuery({
    queryKey: ['current-user-role', user?.id, organization?.id],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as 'admin' | 'readonly' | null;
    },
    enabled: !!user?.id && !!organization?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const isAdmin = role === 'admin';

  return {
    canViewMargins: isAdmin,
    canCreateInvoices: isAdmin,
    canManageUsers: isAdmin,
    canManageProspects: true, // All users can manage prospects
    isAdmin,
    isLoading,
  };
}
