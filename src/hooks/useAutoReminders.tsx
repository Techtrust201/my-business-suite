import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export type ReminderActionType = 'reminder' | 'notification' | 'status_change';
export type ReminderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AutoReminderRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_status_id: string | null;
  days_in_status: number;
  action_type: ReminderActionType;
  reminder_title: string | null;
  reminder_message: string | null;
  new_status_id: string | null;
  notify_created_by: boolean;
  notify_assigned_to: boolean;
  notify_role_id: string | null;
  priority: ReminderPriority;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  trigger_status?: {
    id: string;
    name: string;
    color: string;
  } | null;
  new_status?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export interface AutoReminderRuleInput {
  name: string;
  description?: string;
  trigger_status_id?: string | null;
  days_in_status: number;
  action_type: ReminderActionType;
  reminder_title?: string;
  reminder_message?: string;
  new_status_id?: string | null;
  notify_created_by?: boolean;
  notify_assigned_to?: boolean;
  notify_role_id?: string | null;
  priority?: ReminderPriority;
  is_active?: boolean;
}

export function useAutoReminderRules() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['auto-reminder-rules', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('auto_reminder_rules')
        .select(`
          *,
          trigger_status:prospect_statuses!trigger_status_id(id, name, color),
          new_status:prospect_statuses!new_status_id(id, name, color)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching auto reminder rules:', error);
        return [];
      }

      return data as AutoReminderRule[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateAutoReminderRule() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AutoReminderRuleInput) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('auto_reminder_rules')
        .insert({
          organization_id: organization.id,
          name: input.name,
          description: input.description,
          trigger_status_id: input.trigger_status_id,
          days_in_status: input.days_in_status,
          action_type: input.action_type,
          reminder_title: input.reminder_title,
          reminder_message: input.reminder_message,
          new_status_id: input.new_status_id,
          notify_created_by: input.notify_created_by ?? true,
          notify_assigned_to: input.notify_assigned_to ?? true,
          notify_role_id: input.notify_role_id,
          priority: input.priority ?? 'normal',
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reminder-rules'] });
      toast.success('Règle de relance créée');
    },
    onError: (error) => {
      console.error('Error creating auto reminder rule:', error);
      toast.error('Erreur lors de la création de la règle');
    },
  });
}

export function useUpdateAutoReminderRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: AutoReminderRuleInput & { id: string }) => {
      const { data, error } = await supabase
        .from('auto_reminder_rules')
        .update({
          name: input.name,
          description: input.description,
          trigger_status_id: input.trigger_status_id,
          days_in_status: input.days_in_status,
          action_type: input.action_type,
          reminder_title: input.reminder_title,
          reminder_message: input.reminder_message,
          new_status_id: input.new_status_id,
          notify_created_by: input.notify_created_by,
          notify_assigned_to: input.notify_assigned_to,
          notify_role_id: input.notify_role_id,
          priority: input.priority,
          is_active: input.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reminder-rules'] });
      toast.success('Règle de relance mise à jour');
    },
    onError: (error) => {
      console.error('Error updating auto reminder rule:', error);
      toast.error('Erreur lors de la mise à jour de la règle');
    },
  });
}

export function useDeleteAutoReminderRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('auto_reminder_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reminder-rules'] });
      toast.success('Règle de relance supprimée');
    },
    onError: (error) => {
      console.error('Error deleting auto reminder rule:', error);
      toast.error('Erreur lors de la suppression de la règle');
    },
  });
}

export function useToggleAutoReminderRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('auto_reminder_rules')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auto-reminder-rules'] });
      toast.success(data.is_active ? 'Règle activée' : 'Règle désactivée');
    },
    onError: (error) => {
      console.error('Error toggling auto reminder rule:', error);
      toast.error("Erreur lors de l'activation/désactivation");
    },
  });
}

// Function to manually trigger the auto-reminder check (calls Supabase RPC)
export function useProcessAutoReminders() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_auto_reminders');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Relances automatiques traitées');
    },
    onError: (error) => {
      console.error('Error processing auto reminders:', error);
      toast.error('Erreur lors du traitement des relances');
    },
  });
}
