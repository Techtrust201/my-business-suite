import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StatusCount {
  status: string;
  label: string;
  count: number;
  color: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'hsl(var(--muted-foreground))' },
  sent: { label: 'Envoyée', color: 'hsl(var(--primary))' },
  viewed: { label: 'Consultée', color: 'hsl(210, 80%, 60%)' },
  paid: { label: 'Payée', color: 'hsl(142, 76%, 36%)' },
  partially_paid: { label: 'Partiel', color: 'hsl(45, 93%, 47%)' },
  overdue: { label: 'En retard', color: 'hsl(0, 84%, 60%)' },
  cancelled: { label: 'Annulée', color: 'hsl(var(--muted))' },
};

export function useInvoiceStatusChart() {
  return useQuery({
    queryKey: ['invoice-status-chart'],
    queryFn: async (): Promise<StatusCount[]> => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('status');

      if (!invoices) return [];

      // Count by status
      const statusCounts: Record<string, number> = {};
      invoices.forEach((inv) => {
        const status = inv.status || 'draft';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      // Transform to array with labels and colors
      return Object.entries(statusCounts)
        .map(([status, count]) => ({
          status,
          label: statusConfig[status]?.label || status,
          count,
          color: statusConfig[status]?.color || 'hsl(var(--muted))',
        }))
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count);
    },
  });
}

interface TopClient {
  id: string;
  name: string;
  totalRevenue: number;
  invoiceCount: number;
}

export function useTopClients(limit: number = 5) {
  return useQuery({
    queryKey: ['top-clients', limit],
    queryFn: async (): Promise<TopClient[]> => {
      // Fetch paid invoices with contact info
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select(`
          total,
          contact_id,
          contact:contacts(id, company_name, first_name, last_name)
        `)
        .eq('status', 'paid')
        .not('contact_id', 'is', null);

      if (!paidInvoices) return [];

      // Group by contact
      const clientStats: Record<string, TopClient> = {};

      paidInvoices.forEach((inv) => {
        const contact = inv.contact as any;
        if (!contact) return;

        const clientId = contact.id;
        const clientName =
          contact.company_name ||
          `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
          'Client inconnu';

        if (!clientStats[clientId]) {
          clientStats[clientId] = {
            id: clientId,
            name: clientName,
            totalRevenue: 0,
            invoiceCount: 0,
          };
        }

        clientStats[clientId].totalRevenue += Number(inv.total || 0);
        clientStats[clientId].invoiceCount += 1;
      });

      return Object.values(clientStats)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
    },
  });
}
