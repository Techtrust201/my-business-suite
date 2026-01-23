import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';

export interface UserPermissions {
  canViewMargins: boolean;
  canCreateInvoices: boolean;
  canManageUsers: boolean;
  canManageProspects: boolean;
  canSendEmails: boolean;
  canViewDashboard: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

interface UserRoleData {
  role: 'admin' | 'readonly';
  can_manage_prospects?: boolean;
  can_send_emails?: boolean;
  can_view_dashboard?: boolean;
}

export function useCurrentUserPermissions(): UserPermissions {
  const { user } = useAuth();
  const { organization } = useOrganization();

  const { data: roleData, isLoading } = useQuery({
    queryKey: ['current-user-role', user?.id, organization?.id],
    queryFn: async (): Promise<UserRoleData | null> => {
      if (!user?.id || !organization?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role, can_manage_prospects, can_send_emails, can_view_dashboard')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .order('role', { ascending: true }) // 'admin' comes before 'readonly' alphabetically - safety fallback
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data as UserRoleData | null;
    },
    enabled: !!user?.id && !!organization?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const isAdmin = roleData?.role === 'admin';

  // Admins have all permissions, otherwise check specific permissions
  return {
    canViewMargins: isAdmin,
    canCreateInvoices: isAdmin,
    canManageUsers: isAdmin,
    canManageProspects: isAdmin || (roleData?.can_manage_prospects ?? true),
    canSendEmails: isAdmin || (roleData?.can_send_emails ?? true),
    canViewDashboard: isAdmin || (roleData?.can_view_dashboard ?? true),
    isAdmin,
    isLoading,
  };
}
