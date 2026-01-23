import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';

export type ProspectSource = 'terrain' | 'web' | 'referral' | 'salon' | 'phoning' | 'other';

export interface SourceKPI {
  source: ProspectSource;
  label: string;
  count: number;
  converted: number;
  conversionRate: number;
  revenue: number;
}

export interface ChannelKPI {
  channel: string;
  label: string;
  count: number;
  totalHT: number;
  avgValue: number;
}

export interface ProspectKPIStats {
  bySource: SourceKPI[];
  totalProspects: number;
  totalConverted: number;
  overallConversionRate: number;
}

const sourceLabels: Record<string, string> = {
  terrain: 'Terrain',
  web: 'Web',
  referral: 'Recommandation',
  salon: 'Salon',
  phoning: 'Phoning',
  other: 'Autre',
};

export function useProspectSourceKPIs() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect-source-kpis', organization?.id],
    queryFn: async (): Promise<ProspectKPIStats> => {
      if (!organization?.id) {
        return {
          bySource: [],
          totalProspects: 0,
          totalConverted: 0,
          overallConversionRate: 0,
        };
      }

      // Fetch all prospects with their source
      const { data: prospects, error } = await supabase
        .from('prospects')
        .select('id, source, converted_at, contact_id')
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error fetching prospect source KPIs:', error);
        return {
          bySource: [],
          totalProspects: 0,
          totalConverted: 0,
          overallConversionRate: 0,
        };
      }

      // Group by source and calculate KPIs
      const sourceMap = new Map<string, { count: number; converted: number }>();

      prospects?.forEach((prospect) => {
        const source = prospect.source || 'other';
        const existing = sourceMap.get(source) || { count: 0, converted: 0 };
        existing.count += 1;
        if (prospect.converted_at || prospect.contact_id) {
          existing.converted += 1;
        }
        sourceMap.set(source, existing);
      });

      // Fetch revenue by source (from converted prospects -> contacts -> invoices)
      const convertedProspectIds = prospects
        ?.filter((p) => p.contact_id)
        .map((p) => p.contact_id)
        .filter(Boolean) as string[];

      let revenueBySource: Record<string, number> = {};

      if (convertedProspectIds.length > 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('contact_id, total_ht')
          .in('contact_id', convertedProspectIds)
          .eq('status', 'paid');

        // Map contact_id back to source
        const contactSourceMap = new Map<string, string>();
        prospects?.forEach((p) => {
          if (p.contact_id) {
            contactSourceMap.set(p.contact_id, p.source || 'other');
          }
        });

        invoices?.forEach((inv) => {
          const source = contactSourceMap.get(inv.contact_id) || 'other';
          revenueBySource[source] = (revenueBySource[source] || 0) + Number(inv.total_ht || 0);
        });
      }

      // Build KPI array
      const bySource: SourceKPI[] = Array.from(sourceMap.entries()).map(([source, stats]) => ({
        source: source as ProspectSource,
        label: sourceLabels[source] || source,
        count: stats.count,
        converted: stats.converted,
        conversionRate: stats.count > 0 ? Math.round((stats.converted / stats.count) * 100) : 0,
        revenue: revenueBySource[source] || 0,
      }));

      // Sort by count descending
      bySource.sort((a, b) => b.count - a.count);

      const totalProspects = prospects?.length || 0;
      const totalConverted = prospects?.filter((p) => p.converted_at || p.contact_id).length || 0;

      return {
        bySource,
        totalProspects,
        totalConverted,
        overallConversionRate: totalProspects > 0 ? Math.round((totalConverted / totalProspects) * 100) : 0,
      };
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRevenueByChannel() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['revenue-by-channel', organization?.id],
    queryFn: async (): Promise<ChannelKPI[]> => {
      if (!organization?.id) return [];

      // Get invoices with contact info
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          id,
          total_ht,
          contact_id,
          contact:contacts(id, type)
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'paid');

      if (error) {
        console.error('Error fetching revenue by channel:', error);
        return [];
      }

      // Get prospect sources for contacts
      const contactIds = invoices
        ?.map((inv) => inv.contact_id)
        .filter(Boolean) as string[];

      const { data: prospectSources } = await supabase
        .from('prospects')
        .select('contact_id, source')
        .in('contact_id', contactIds);

      const sourceMap = new Map<string, string>();
      prospectSources?.forEach((ps) => {
        if (ps.contact_id) {
          sourceMap.set(ps.contact_id, ps.source || 'direct');
        }
      });

      // Group by channel (source for prospected clients, 'direct' for others)
      const channelMap = new Map<string, { count: number; total: number }>();

      invoices?.forEach((inv) => {
        const channel = sourceMap.get(inv.contact_id) || 'direct';
        const existing = channelMap.get(channel) || { count: 0, total: 0 };
        existing.count += 1;
        existing.total += Number(inv.total_ht || 0);
        channelMap.set(channel, existing);
      });

      // Build KPI array
      const channelKPIs: ChannelKPI[] = Array.from(channelMap.entries()).map(([channel, stats]) => ({
        channel,
        label: sourceLabels[channel] || (channel === 'direct' ? 'Vente directe' : channel),
        count: stats.count,
        totalHT: Math.round(stats.total * 100) / 100,
        avgValue: stats.count > 0 ? Math.round((stats.total / stats.count) * 100) / 100 : 0,
      }));

      // Sort by total descending
      channelKPIs.sort((a, b) => b.totalHT - a.totalHT);

      return channelKPIs;
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
