import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

export interface ProspectQuote {
  id: string;
  number: string;
  subject: string | null;
  status: string;
  date: string;
  valid_until: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  created_at: string;
}

// Get quotes linked to a prospect via its converted contact_id
export function useProspectQuotes(contactId?: string | null) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect-quotes', contactId],
    queryFn: async () => {
      if (!contactId || !organization?.id) return [];

      const { data, error } = await supabase
        .from('quotes')
        .select('id, number, subject, status, date, valid_until, subtotal, tax_amount, total, created_at')
        .eq('contact_id', contactId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProspectQuote[];
    },
    enabled: !!contactId && !!organization?.id,
  });
}
