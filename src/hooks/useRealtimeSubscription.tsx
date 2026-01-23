import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'invoices' | 'quotes' | 'contacts' | 'prospects' | 'prospect_statuses' | 'prospect_visits' | 'prospect_notes';

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  queryKeys: string[][];
}

export function useRealtimeSubscription({ tables, queryKeys }: UseRealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels = tables.map((table, index) => {
      return supabase
        .channel(`realtime-${table}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          () => {
            // Invalidate all related query keys for this table
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [tables, queryKeys, queryClient]);
}

// Hook to subscribe to all main tables for dashboard updates
export function useDashboardRealtime() {
  useRealtimeSubscription({
    tables: ['invoices', 'quotes', 'contacts', 'prospects', 'prospect_statuses'],
    queryKeys: [
      ['dashboard-stats'],
      ['recent-activity'],
      ['revenue-chart'],
      ['invoice-status-chart'],
      ['top-clients'],
      ['invoices'],
      ['quotes'],
      ['contacts'],
      ['prospects'],
      ['prospect-kpis'],
      ['prospect-activity'],
    ],
  });
}

// Hook specifically for CRM/Prospect pages realtime updates
export function useCRMRealtime() {
  useRealtimeSubscription({
    tables: ['prospects', 'prospect_statuses', 'prospect_visits', 'prospect_notes'],
    queryKeys: [
      ['prospects'],
      ['prospect'],
      ['prospect-kpis'],
      ['prospect-activity'],
      ['prospect-notes'],
      ['prospect-visits'],
      ['prospect-contacts'],
    ],
  });
}
