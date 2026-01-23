import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { startOfMonth, subMonths, format } from 'date-fns';

interface ProspectKpis {
  totalProspects: number;
  byStatus: {
    statusId: string;
    statusName: string;
    statusColor: string;
    count: number;
    countThisMonth: number;
    isFinalPositive: boolean;
    isFinalNegative: boolean;
  }[];
  potentialRevenue: number;
  conversionRate: number;
  thisMonthCreated: number;
  previousMonthCreated: number;
  growthRate: number;
}

export function useProspectKpis() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect-kpis', organization?.id],
    queryFn: async (): Promise<ProspectKpis> => {
      if (!organization?.id) {
        return {
          totalProspects: 0,
          byStatus: [],
          potentialRevenue: 0,
          conversionRate: 0,
          thisMonthCreated: 0,
          previousMonthCreated: 0,
          growthRate: 0,
        };
      }

      const now = new Date();
      const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const previousMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
      const previousMonthEnd = format(startOfMonth(now), 'yyyy-MM-dd');

      // Fetch all prospects with their statuses
      const { data: prospects } = await supabase
        .from('prospects')
        .select(`
          id,
          created_at,
          status_id,
          status:prospect_statuses(id, name, color, is_final_positive, is_final_negative)
        `)
        .eq('organization_id', organization.id);

      // Fetch all statuses for the organization
      const { data: statuses } = await supabase
        .from('prospect_statuses')
        .select('id, name, color, is_final_positive, is_final_negative, position')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('position');

      // Fetch open quotes linked to prospects for potential revenue
      const { data: quotes } = await supabase
        .from('quotes')
        .select('total, contact_id')
        .eq('organization_id', organization.id)
        .in('status', ['draft', 'sent']);

      // Calculate stats by status
      const byStatus = (statuses || []).map(status => {
        const statusProspects = (prospects || []).filter(p => p.status_id === status.id);
        const thisMonthProspects = statusProspects.filter(p => 
          p.created_at && p.created_at >= thisMonthStart
        );

        return {
          statusId: status.id,
          statusName: status.name,
          statusColor: status.color,
          count: statusProspects.length,
          countThisMonth: thisMonthProspects.length,
          isFinalPositive: status.is_final_positive,
          isFinalNegative: status.is_final_negative,
        };
      });

      // Calculate totals
      const totalProspects = prospects?.length || 0;
      const signedCount = byStatus.filter(s => s.isFinalPositive).reduce((sum, s) => sum + s.count, 0);
      const conversionRate = totalProspects > 0 ? Math.round((signedCount / totalProspects) * 100) : 0;

      // Calculate potential revenue from open quotes
      const potentialRevenue = quotes?.reduce((sum, q) => sum + Number(q.total || 0), 0) || 0;

      // This month vs previous month
      const thisMonthCreated = (prospects || []).filter(p => 
        p.created_at && p.created_at >= thisMonthStart
      ).length;

      const previousMonthCreated = (prospects || []).filter(p => 
        p.created_at && p.created_at >= previousMonthStart && p.created_at < previousMonthEnd
      ).length;

      const growthRate = previousMonthCreated > 0 
        ? Math.round(((thisMonthCreated - previousMonthCreated) / previousMonthCreated) * 100)
        : thisMonthCreated > 0 ? 100 : 0;

      return {
        totalProspects,
        byStatus,
        potentialRevenue,
        conversionRate,
        thisMonthCreated,
        previousMonthCreated,
        growthRate,
      };
    },
    enabled: !!organization?.id,
  });
}
