import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MonthlyRevenue {
  month: string;
  monthLabel: string;
  revenue: number;
  invoiceCount: number;
}

export function useRevenueChart() {
  return useQuery({
    queryKey: ['revenue-chart'],
    queryFn: async (): Promise<MonthlyRevenue[]> => {
      const now = new Date();
      const monthsData: MonthlyRevenue[] = [];

      // Fetch all paid invoices from last 12 months in one query
      const startDate = startOfMonth(subMonths(now, 11));
      const endDate = endOfMonth(now);

      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total, paid_at')
        .eq('status', 'paid')
        .gte('paid_at', format(startDate, 'yyyy-MM-dd'))
        .lte('paid_at', format(endDate, 'yyyy-MM-dd'));

      // Group by month
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthKey = format(monthDate, 'yyyy-MM');

        const monthInvoices = paidInvoices?.filter((inv) => {
          if (!inv.paid_at) return false;
          const paidDate = new Date(inv.paid_at);
          return paidDate >= monthStart && paidDate <= monthEnd;
        }) || [];

        monthsData.push({
          month: monthKey,
          monthLabel: format(monthDate, 'MMM yy', { locale: fr }),
          revenue: monthInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0),
          invoiceCount: monthInvoices.length,
        });
      }

      return monthsData;
    },
  });
}

interface UnpaidByMonth {
  month: string;
  monthLabel: string;
  unpaidAmount: number;
  unpaidCount: number;
}

export function useUnpaidInvoicesChart() {
  return useQuery({
    queryKey: ['unpaid-invoices-chart'],
    queryFn: async (): Promise<UnpaidByMonth[]> => {
      const now = new Date();
      const monthsData: UnpaidByMonth[] = [];

      // Fetch all unpaid invoices
      const { data: unpaidInvoices } = await supabase
        .from('invoices')
        .select('total, amount_paid, created_at')
        .in('status', ['sent', 'overdue', 'partially_paid']);

      // Group by month (by creation date)
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthKey = format(monthDate, 'yyyy-MM');

        const monthInvoices = unpaidInvoices?.filter((inv) => {
          if (!inv.created_at) return false;
          const createdDate = new Date(inv.created_at);
          return createdDate >= monthStart && createdDate <= monthEnd;
        }) || [];

        monthsData.push({
          month: monthKey,
          monthLabel: format(monthDate, 'MMM yy', { locale: fr }),
          unpaidAmount: monthInvoices.reduce(
            (sum, inv) => sum + (Number(inv.total || 0) - Number(inv.amount_paid || 0)),
            0
          ),
          unpaidCount: monthInvoices.length,
        });
      }

      return monthsData;
    },
  });
}
