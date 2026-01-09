import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface DashboardStats {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  revenueChange: number;
  pendingInvoicesCount: number;
  pendingInvoicesAmount: number;
  openQuotesCount: number;
  openQuotesAmount: number;
  activeClientsCount: number;
}

interface RecentActivity {
  id: string;
  type: 'invoice' | 'quote';
  number: string;
  contact_name: string | null;
  total: number;
  status: string;
  created_at: string;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      const previousMonthEnd = endOfMonth(subMonths(now, 1));

      // Fetch current month paid invoices
      const { data: currentMonthInvoices } = await supabase
        .from('invoices')
        .select('total, amount_paid')
        .eq('status', 'paid')
        .gte('paid_at', format(currentMonthStart, 'yyyy-MM-dd'))
        .lte('paid_at', format(currentMonthEnd, 'yyyy-MM-dd'));

      const monthlyRevenue = currentMonthInvoices?.reduce((sum, inv) => 
        sum + Number(inv.total || 0), 0) || 0;

      // Fetch previous month paid invoices
      const { data: previousMonthInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('status', 'paid')
        .gte('paid_at', format(previousMonthStart, 'yyyy-MM-dd'))
        .lte('paid_at', format(previousMonthEnd, 'yyyy-MM-dd'));

      const previousMonthRevenue = previousMonthInvoices?.reduce((sum, inv) => 
        sum + Number(inv.total || 0), 0) || 0;

      // Calculate change percentage
      const revenueChange = previousMonthRevenue > 0 
        ? Math.round(((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
        : monthlyRevenue > 0 ? 100 : 0;

      // Fetch pending invoices (sent, overdue, partially_paid)
      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select('total, amount_paid')
        .in('status', ['sent', 'overdue', 'partially_paid']);

      const pendingInvoicesCount = pendingInvoices?.length || 0;
      const pendingInvoicesAmount = pendingInvoices?.reduce((sum, inv) => 
        sum + (Number(inv.total || 0) - Number(inv.amount_paid || 0)), 0) || 0;

      // Fetch open quotes (sent status)
      const { data: openQuotes } = await supabase
        .from('quotes')
        .select('total')
        .eq('status', 'sent');

      const openQuotesCount = openQuotes?.length || 0;
      const openQuotesAmount = openQuotes?.reduce((sum, q) => 
        sum + Number(q.total || 0), 0) || 0;

      // Fetch active clients (clients with recent invoices or quotes in last 90 days)
      const ninetyDaysAgo = format(subMonths(now, 3), 'yyyy-MM-dd');
      
      const { data: recentInvoiceContacts } = await supabase
        .from('invoices')
        .select('contact_id')
        .gte('created_at', ninetyDaysAgo)
        .not('contact_id', 'is', null);

      const { data: recentQuoteContacts } = await supabase
        .from('quotes')
        .select('contact_id')
        .gte('created_at', ninetyDaysAgo)
        .not('contact_id', 'is', null);

      const contactIds = new Set([
        ...(recentInvoiceContacts?.map(i => i.contact_id) || []),
        ...(recentQuoteContacts?.map(q => q.contact_id) || []),
      ]);

      const activeClientsCount = contactIds.size;

      return {
        monthlyRevenue,
        previousMonthRevenue,
        revenueChange,
        pendingInvoicesCount,
        pendingInvoicesAmount,
        openQuotesCount,
        openQuotesAmount,
        activeClientsCount,
      };
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async (): Promise<RecentActivity[]> => {
      // Fetch recent invoices
      const { data: recentInvoices } = await supabase
        .from('invoices')
        .select(`
          id,
          number,
          total,
          status,
          created_at,
          contact:contacts(company_name, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent quotes
      const { data: recentQuotes } = await supabase
        .from('quotes')
        .select(`
          id,
          number,
          total,
          status,
          created_at,
          contact:contacts(company_name, first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = [];

      recentInvoices?.forEach(inv => {
        const contact = inv.contact as any;
        activities.push({
          id: inv.id,
          type: 'invoice',
          number: inv.number || '',
          contact_name: contact?.company_name || 
            (contact?.first_name && contact?.last_name 
              ? `${contact.first_name} ${contact.last_name}` 
              : null),
          total: Number(inv.total || 0),
          status: inv.status,
          created_at: inv.created_at || '',
        });
      });

      recentQuotes?.forEach(q => {
        const contact = q.contact as any;
        activities.push({
          id: q.id,
          type: 'quote',
          number: q.number || '',
          contact_name: contact?.company_name || 
            (contact?.first_name && contact?.last_name 
              ? `${contact.first_name} ${contact.last_name}` 
              : null),
          total: Number(q.total || 0),
          status: q.status,
          created_at: q.created_at || '',
        });
      });

      // Sort by created_at and take top 5
      return activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    },
  });
}
