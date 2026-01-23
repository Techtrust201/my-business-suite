import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';
import { format, addDays, startOfDay } from 'date-fns';

export interface Reminder {
  id: string;
  organization_id: string;
  user_id: string | null;
  entity_type: 'prospect' | 'invoice' | 'quote' | 'client';
  entity_id: string;
  entity_name: string | null;
  reminder_date: string;
  title: string;
  notes: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  creator?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

export function useUpcomingReminders(days: number = 7) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['reminders', 'upcoming', organization?.id, days],
    queryFn: async () => {
      if (!organization?.id) return [];

      const futureDate = format(addDays(new Date(), days), 'yyyy-MM-dd');

      // Use raw query since table is newly created and types not yet synced
      const { data, error } = await supabase
        .from('reminders' as any)
        .select(`
          id,
          organization_id,
          user_id,
          entity_type,
          entity_id,
          entity_name,
          reminder_date,
          title,
          notes,
          is_completed,
          completed_at,
          created_by,
          created_at
        `)
        .eq('organization_id', organization.id)
        .eq('is_completed', false)
        .lte('reminder_date', futureDate)
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Reminder[];
    },
    enabled: !!organization?.id,
  });
}

export function useOverdueReminders() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['reminders', 'overdue', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('reminders' as any)
        .select(`
          id,
          organization_id,
          user_id,
          entity_type,
          entity_id,
          entity_name,
          reminder_date,
          title,
          notes,
          is_completed,
          completed_at,
          created_by,
          created_at
        `)
        .eq('organization_id', organization.id)
        .eq('is_completed', false)
        .lt('reminder_date', today)
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Reminder[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateReminder() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminder: {
      entity_type: Reminder['entity_type'];
      entity_id: string;
      entity_name?: string;
      reminder_date: string;
      title: string;
      notes?: string;
      user_id?: string;
    }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('reminders' as any)
        .insert({
          entity_type: reminder.entity_type,
          entity_id: reminder.entity_id,
          entity_name: reminder.entity_name,
          reminder_date: reminder.reminder_date,
          title: reminder.title,
          notes: reminder.notes,
          organization_id: organization.id,
          created_by: user?.id,
          user_id: reminder.user_id || user?.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as unknown as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Rappel créé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création du rappel');
      console.error(error);
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { data, error } = await supabase
        .from('reminders' as any)
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .select('*')
        .single();

      if (error) throw error;
      return data as unknown as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Rappel terminé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du rappel');
      console.error(error);
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase
        .from('reminders' as any)
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Rappel supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression du rappel');
      console.error(error);
    },
  });
}
