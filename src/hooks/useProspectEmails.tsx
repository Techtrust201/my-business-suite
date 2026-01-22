import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProspectEmail {
  id: string;
  prospect_id: string;
  organization_id: string;
  prospect_contact_id: string | null;
  sent_by: string;
  to_email: string;
  subject: string;
  body: string;
  quote_id: string | null;
  sent_at: string;
  created_at: string;
}

export function useProspectEmails(prospectId?: string) {
  return useQuery({
    queryKey: ['prospect-emails', prospectId],
    queryFn: async () => {
      if (!prospectId) return [];

      const { data, error } = await supabase
        .from('prospect_emails')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as ProspectEmail[];
    },
    enabled: !!prospectId,
  });
}
