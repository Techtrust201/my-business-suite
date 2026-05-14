import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// N13 : remplace la liste SUPER_ADMIN_EMAILS hardcodee. La verite vit
// dans la table platform_admins, exposee via la RPC is_platform_admin().
export function useIsPlatformAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-platform-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc('is_platform_admin');
      if (error) return false;
      return Boolean(data);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
