import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { Tables, Json } from '@/integrations/supabase/types';

export type CommissionRuleType = 'percentage' | 'fixed' | 'tiered' | 'bonus';
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type TargetType = 'monthly' | 'quarterly' | 'yearly';

export interface CommissionTier {
  min: number;
  max: number | null;
  rate: number;
}

// Use database types directly
export type CommissionRuleDB = Tables<'commission_rules'>;
export type CommissionDB = Tables<'commissions'>;
export type CommissionTargetDB = Tables<'commission_targets'>;

export interface CommissionRule extends Omit<CommissionRuleDB, 'tiers'> {
  tiers: CommissionTier[] | null;
  applies_to_user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface Commission extends CommissionDB {
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  invoice?: {
    id: string;
    number: string;
    contact?: {
      company_name: string | null;
      first_name: string | null;
      last_name: string | null;
    };
  };
}

export interface CommissionTarget extends CommissionTargetDB {
  user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

// ===== Commission Rules =====

export function useCommissionRules() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['commission-rules', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('commission_rules')
        .select(`
          *,
          applies_to_user:profiles!applies_to_user_id(id, first_name, last_name, email)
        `)
        .eq('organization_id', organization.id)
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching commission rules:', error);
        return [];
      }

      // Parse tiers JSON
      return data.map(rule => ({
        ...rule,
        tiers: rule.tiers ? (rule.tiers as unknown as CommissionTier[]) : null,
      })) as CommissionRule[];
    },
    enabled: !!organization?.id,
  });
}

export interface CommissionRuleInput {
  name: string;
  description?: string;
  rule_type: CommissionRuleType;
  base_percentage?: number;
  fixed_amount?: number;
  tiers?: CommissionTier[];
  min_invoice_amount?: number | null;
  min_monthly_target?: number | null;
  bonus_percentage?: number;
  bonus_threshold_amount?: number | null;
  applies_to_user_id?: string | null;
  is_active?: boolean;
  priority?: number;
}

export function useCreateCommissionRule() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CommissionRuleInput) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('commission_rules')
        .insert({
          organization_id: organization.id,
          name: input.name,
          description: input.description,
          rule_type: input.rule_type,
          base_percentage: input.base_percentage || 0,
          fixed_amount: input.fixed_amount || 0,
          tiers: input.tiers ? (input.tiers as unknown as Json) : null,
          min_invoice_amount: input.min_invoice_amount,
          min_monthly_target: input.min_monthly_target,
          bonus_percentage: input.bonus_percentage || 0,
          bonus_threshold_amount: input.bonus_threshold_amount,
          applies_to_user_id: input.applies_to_user_id,
          is_active: input.is_active ?? true,
          priority: input.priority || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast.success('Règle de commission créée');
    },
    onError: (error) => {
      console.error('Error creating commission rule:', error);
      toast.error('Erreur lors de la création de la règle');
    },
  });
}

export function useUpdateCommissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: CommissionRuleInput & { id: string }) => {
      const { data, error } = await supabase
        .from('commission_rules')
        .update({
          name: input.name,
          description: input.description,
          rule_type: input.rule_type,
          base_percentage: input.base_percentage,
          fixed_amount: input.fixed_amount,
          tiers: input.tiers ? (input.tiers as unknown as Json) : null,
          min_invoice_amount: input.min_invoice_amount,
          min_monthly_target: input.min_monthly_target,
          bonus_percentage: input.bonus_percentage,
          bonus_threshold_amount: input.bonus_threshold_amount,
          applies_to_user_id: input.applies_to_user_id,
          is_active: input.is_active,
          priority: input.priority,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast.success('Règle de commission mise à jour');
    },
    onError: (error) => {
      console.error('Error updating commission rule:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

export function useDeleteCommissionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast.success('Règle de commission supprimée');
    },
    onError: (error) => {
      console.error('Error deleting commission rule:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}

// ===== Commissions =====

export interface UseCommissionsOptions {
  userId?: string;
  status?: CommissionStatus;
  periodMonth?: number;
  periodYear?: number;
}

export function useCommissions(options: UseCommissionsOptions = {}) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['commissions', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('commissions')
        .select(`
          *,
          user:profiles!user_id(id, first_name, last_name, email),
          invoice:invoices(id, number, contact:contacts(company_name, first_name, last_name))
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.periodMonth) {
        query = query.eq('period_month', options.periodMonth);
      }
      if (options.periodYear) {
        query = query.eq('period_year', options.periodYear);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching commissions:', error);
        return [];
      }

      return data as unknown as Commission[];
    },
    enabled: !!organization?.id,
  });
}

// Get user's own commissions
export function useMyCommissions(options: Omit<UseCommissionsOptions, 'userId'> = {}) {
  const { user } = useAuth();
  return useCommissions({ ...options, userId: user?.id });
}

export function useUpdateCommissionStatus() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      paymentReference,
    }: {
      id: string;
      status: CommissionStatus;
      notes?: string;
      paymentReference?: string;
    }) => {
      const updateData: Record<string, any> = { status, notes };

      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      } else if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
        updateData.payment_reference = paymentReference;
      }

      const { data, error } = await supabase
        .from('commissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      const statusLabels: Record<CommissionStatus, string> = {
        pending: 'en attente',
        approved: 'approuvée',
        paid: 'payée',
        cancelled: 'annulée',
      };
      toast.success(`Commission ${statusLabels[variables.status]}`);
    },
    onError: (error) => {
      console.error('Error updating commission status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    },
  });
}

// ===== Commission Targets =====

export function useCommissionTargets(options: { userId?: string; periodYear?: number } = {}) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['commission-targets', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('commission_targets')
        .select(`
          *,
          user:profiles!user_id(id, first_name, last_name, email)
        `)
        .eq('organization_id', organization.id)
        .order('period_year', { ascending: false });

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }
      if (options.periodYear) {
        query = query.eq('period_year', options.periodYear);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching commission targets:', error);
        return [];
      }

      return data as unknown as CommissionTarget[];
    },
    enabled: !!organization?.id,
  });
}

export function useMyCommissionTargets(options: { periodYear?: number } = {}) {
  const { user } = useAuth();
  return useCommissionTargets({ ...options, userId: user?.id });
}

export interface CommissionTargetInput {
  user_id: string;
  target_type: TargetType;
  period_month?: number;
  period_quarter?: number;
  period_year: number;
  target_amount: number;
  bonus_threshold_percent?: number;
  bonus_amount?: number;
}

export function useCreateCommissionTarget() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CommissionTargetInput) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('commission_targets')
        .insert({
          organization_id: organization.id,
          user_id: input.user_id,
          target_type: input.target_type,
          period_month: input.period_month,
          period_quarter: input.period_quarter,
          period_year: input.period_year,
          target_amount: input.target_amount,
          bonus_threshold_percent: input.bonus_threshold_percent || 100,
          bonus_amount: input.bonus_amount || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-targets'] });
      toast.success('Objectif créé');
    },
    onError: (error) => {
      console.error('Error creating commission target:', error);
      toast.error("Erreur lors de la création de l'objectif");
    },
  });
}

export function useUpdateCommissionTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CommissionTargetInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('commission_targets')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-targets'] });
      toast.success('Objectif mis à jour');
    },
    onError: (error) => {
      console.error('Error updating commission target:', error);
      toast.error("Erreur lors de la mise à jour de l'objectif");
    },
  });
}

// ===== Commission Statistics =====

export interface CommissionStats {
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  totalThisMonth: number;
  totalThisYear: number;
  count: number;
}

export function useCommissionStats() {
  const { organization } = useOrganization();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commission-stats', organization?.id, user?.id],
    queryFn: async (): Promise<CommissionStats> => {
      if (!organization?.id) {
        return {
          totalPending: 0,
          totalApproved: 0,
          totalPaid: 0,
          totalThisMonth: 0,
          totalThisYear: 0,
          count: 0,
        };
      }

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const { data: commissions, error } = await supabase
        .from('commissions')
        .select('total_amount, status, period_month, period_year')
        .eq('organization_id', organization.id);

      if (error) {
        console.error('Error fetching commission stats:', error);
        return {
          totalPending: 0,
          totalApproved: 0,
          totalPaid: 0,
          totalThisMonth: 0,
          totalThisYear: 0,
          count: 0,
        };
      }

      const stats: CommissionStats = {
        totalPending: 0,
        totalApproved: 0,
        totalPaid: 0,
        totalThisMonth: 0,
        totalThisYear: 0,
        count: commissions.length,
      };

      commissions.forEach((c) => {
        const amount = Number(c.total_amount) || 0;

        if (c.status === 'pending') {
          stats.totalPending += amount;
        } else if (c.status === 'approved') {
          stats.totalApproved += amount;
        } else if (c.status === 'paid') {
          stats.totalPaid += amount;
        }

        if (c.period_month === currentMonth && c.period_year === currentYear) {
          stats.totalThisMonth += amount;
        }

        if (c.period_year === currentYear) {
          stats.totalThisYear += amount;
        }
      });

      return stats;
    },
    enabled: !!organization?.id,
  });
}

// Note: calculate_invoice_commission RPC doesn't exist - stub function
export function useCalculateCommission() {
  return useMutation({
    mutationFn: async ({ invoiceId, userId }: { invoiceId: string; userId: string }) => {
      // This RPC function doesn't exist in the database yet
      console.warn('calculate_invoice_commission RPC not implemented');
      return null;
    },
  });
}
