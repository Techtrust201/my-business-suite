import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  organization_id: string;
  user_id: string | null;
  title: string;
  notes: string | null;
  remind_at: string | null;
  reminder_date: string;
  is_completed: boolean | null;
  completed_at: string | null;
  prospect_id: string | null;
  contact_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  entity_id: string;
  entity_type: string;
  entity_name: string | null;
  recurrence: string | null;
  recurrence_end_date: string | null;
  created_at: string | null;
  created_by: string | null;
}

export interface ReminderWithRelations extends Reminder {
  prospect?: {
    id: string;
    company_name: string;
  } | null;
  contact?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export interface CreateReminderInput {
  title: string;
  description?: string;
  remind_at: string;
  prospect_id?: string;
  contact_id?: string;
  quote_id?: string;
  invoice_id?: string;
  recurrence?: RecurrenceType;
  recurrence_end_date?: string;
}

interface UseRemindersOptions {
  prospectId?: string;
  contactId?: string;
  upcoming?: boolean;
  completed?: boolean;
}

export function useReminders(options: UseRemindersOptions = {}) {
  const { prospectId, contactId, upcoming = true, completed = false } = options;
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('reminders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reminders'] });
          queryClient.invalidateQueries({ queryKey: ['upcoming-reminders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ['reminders', { prospectId, contactId, upcoming, completed }],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return [];

      let query = supabase
        .from('reminders')
        .select(`
          *,
          prospect:prospects(id, company_name),
          contact:contacts(id, company_name, first_name, last_name)
        `)
        .eq('user_id', user.id)
        .order('reminder_date', { ascending: true });

      if (prospectId) {
        query = query.eq('prospect_id', prospectId);
      }

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      if (!completed) {
        query = query.eq('is_completed', false);
      }

      if (upcoming) {
        query = query.gte('reminder_date', new Date().toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching reminders:', error);
        return [];
      }

      return data as unknown as ReminderWithRelations[];
    },
    enabled: !!user?.id && !!organization?.id,
  });
}

export function useUpcomingRemindersCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['upcoming-reminders-count'],
    queryFn: async () => {
      if (!user?.id) return 0;

      const today = new Date().toISOString().split('T')[0];

      const { count, error } = await supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .lte('reminder_date', today);

      if (error) {
        console.error('Error fetching upcoming reminders count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateReminder() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReminderInput) => {
      if (!user?.id || !organization?.id) throw new Error('No user or organization');

      // Determine entity type and id based on input
      let entityType = 'general';
      let entityId = 'general';
      let entityName = input.title;

      if (input.quote_id) {
        entityType = 'quote';
        entityId = input.quote_id;
      } else if (input.invoice_id) {
        entityType = 'invoice';
        entityId = input.invoice_id;
      } else if (input.prospect_id) {
        entityType = 'prospect';
        entityId = input.prospect_id;
      } else if (input.contact_id) {
        entityType = 'contact';
        entityId = input.contact_id;
      }

      const reminderDate = typeof input.remind_at === 'string' 
        ? input.remind_at.split('T')[0] 
        : new Date(input.remind_at).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('reminders')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          title: input.title,
          notes: input.description || null,
          remind_at: input.remind_at,
          reminder_date: reminderDate,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          prospect_id: input.prospect_id || null,
          contact_id: input.contact_id || null,
          quote_id: input.quote_id || null,
          invoice_id: input.invoice_id || null,
          recurrence: input.recurrence || 'none',
          recurrence_end_date: input.recurrence_end_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders-count'] });
      toast.success('Rappel créé');
    },
    onError: (error) => {
      console.error('Error creating reminder:', error);
      toast.error('Erreur lors de la création du rappel');
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Reminder> & { id: string }) => {
      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders-count'] });
    },
    onError: (error) => {
      console.error('Error updating reminder:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

export function useCompleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders-count'] });
      toast.success('Rappel terminé');
    },
    onError: (error) => {
      console.error('Error completing reminder:', error);
      toast.error('Erreur lors de la complétion');
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-reminders-count'] });
      toast.success('Rappel supprimé');
    },
    onError: (error) => {
      console.error('Error deleting reminder:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}
