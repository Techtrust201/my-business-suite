import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Tables, Json } from '@/integrations/supabase/types';

export type WidgetType =
  | 'revenue'
  | 'unpaid_invoices'
  | 'pending_quotes'
  | 'new_clients'
  | 'revenue_chart'
  | 'prospect_kpis'
  | 'revenue_by_channel'
  | 'activity_feed'
  | 'reminders'
  | 'conversion_funnel'
  | 'commissions'
  | 'custom';

export interface WidgetLayout {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config?: Record<string, any>;
}

export interface DashboardConfig {
  id: string;
  user_id: string | null;
  organization_id: string;
  widgets: WidgetLayout[];
  created_at: string;
  updated_at: string;
}

export interface WidgetPreset {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  widget_type: WidgetType;
  default_config: Record<string, any>;
  default_size: { w: number; h: number };
  is_active: boolean;
  created_at: string;
}

// Default widget layouts for new users
const DEFAULT_WIDGETS: WidgetLayout[] = [
  { id: 'w1', type: 'revenue', x: 0, y: 0, w: 3, h: 2, config: { period: 'month' } },
  { id: 'w2', type: 'unpaid_invoices', x: 3, y: 0, w: 3, h: 2, config: {} },
  { id: 'w3', type: 'pending_quotes', x: 6, y: 0, w: 3, h: 2, config: {} },
  { id: 'w4', type: 'new_clients', x: 9, y: 0, w: 3, h: 2, config: { period: 'month' } },
  { id: 'w5', type: 'revenue_chart', x: 0, y: 2, w: 8, h: 4, config: { months: 12 } },
  { id: 'w6', type: 'activity_feed', x: 8, y: 2, w: 4, h: 4, config: { limit: 10 } },
];

const COMMERCIAL_WIDGETS: WidgetLayout[] = [
  { id: 'w1', type: 'prospect_kpis', x: 0, y: 0, w: 6, h: 3, config: {} },
  { id: 'w2', type: 'conversion_funnel', x: 6, y: 0, w: 6, h: 3, config: {} },
  { id: 'w3', type: 'pending_quotes', x: 0, y: 3, w: 4, h: 2, config: {} },
  { id: 'w4', type: 'commissions', x: 4, y: 3, w: 4, h: 2, config: {} },
  { id: 'w5', type: 'reminders', x: 8, y: 3, w: 4, h: 3, config: {} },
  { id: 'w6', type: 'activity_feed', x: 0, y: 5, w: 8, h: 3, config: { limit: 10 } },
];

const FINANCE_WIDGETS: WidgetLayout[] = [
  { id: 'w1', type: 'revenue', x: 0, y: 0, w: 4, h: 2, config: { period: 'month' } },
  { id: 'w2', type: 'unpaid_invoices', x: 4, y: 0, w: 4, h: 2, config: {} },
  { id: 'w3', type: 'revenue_by_channel', x: 8, y: 0, w: 4, h: 3, config: {} },
  { id: 'w4', type: 'revenue_chart', x: 0, y: 2, w: 8, h: 4, config: { months: 12 } },
  { id: 'w5', type: 'activity_feed', x: 8, y: 3, w: 4, h: 3, config: { limit: 5 } },
];

export function useDashboardConfig(dashboardType: string = 'main') {
  const { organization } = useOrganization();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-config', user?.id, organization?.id, dashboardType],
    queryFn: async (): Promise<DashboardConfig | null> => {
      if (!user?.id || !organization?.id) return null;

      const { data, error } = await supabase
        .from('dashboard_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching dashboard config:', error);
        return null;
      }

      // Return existing config or generate default
      if (data) {
        return {
          id: data.id,
          user_id: data.user_id,
          organization_id: data.organization_id,
          widgets: Array.isArray(data.widgets) ? (data.widgets as unknown as WidgetLayout[]) : DEFAULT_WIDGETS,
          created_at: data.created_at || '',
          updated_at: data.updated_at || '',
        };
      }

      // Return default layout based on dashboard type
      const defaultWidgets =
        dashboardType === 'commercial'
          ? COMMERCIAL_WIDGETS
          : dashboardType === 'finance'
            ? FINANCE_WIDGETS
            : DEFAULT_WIDGETS;

      return {
        id: '',
        user_id: user.id,
        organization_id: organization.id,
        widgets: defaultWidgets,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
    enabled: !!user?.id && !!organization?.id,
  });
}

export function useSaveDashboardConfig() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dashboardType,
      widgets,
    }: {
      dashboardType: string;
      widgets: WidgetLayout[];
    }) => {
      if (!user?.id || !organization?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('dashboard_configs')
        .upsert(
          {
            user_id: user.id,
            organization_id: organization.id,
            widgets: widgets as unknown as Json,
          },
          {
            onConflict: 'user_id,organization_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-config', user?.id, organization?.id, variables.dashboardType],
      });
      toast.success('Dashboard sauvegardé');
    },
    onError: (error) => {
      console.error('Error saving dashboard config:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });
}

export function useWidgetPresets() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['widget-presets', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_presets')
        .select('*')
        .or(`organization_id.is.null,organization_id.eq.${organization?.id}`)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching widget presets:', error);
        return [];
      }

      return data.map(preset => ({
        ...preset,
        default_config: (preset.default_config || {}) as Record<string, any>,
        default_size: (preset.default_size || { w: 4, h: 2 }) as { w: number; h: number },
      })) as WidgetPreset[];
    },
    enabled: !!organization?.id,
  });
}

// Generate unique widget ID
export function generateWidgetId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
