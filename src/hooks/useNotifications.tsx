import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type NotificationType = 
  | 'prospect_assigned'
  | 'quote_status'
  | 'invoice_paid'
  | 'reminder'
  | 'mention'
  | 'new_prospect'
  | 'prospect_status'
  | 'system';

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  data: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface UseNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { limit = 20, unreadOnly = false } = options;
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
          
          // Show toast for new notification
          const notification = payload.new as Notification;
          toast(notification.title, {
            description: notification.message || undefined,
            action: notification.link ? {
              label: 'Voir',
              onClick: () => window.location.href = notification.link!,
            } : undefined,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ['notifications', { limit, unreadOnly }],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('Toutes les notifications ont été marquées comme lues');
    },
    onError: () => {
      toast.error('Erreur lors du marquage des notifications');
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });
}

export function useCreateNotification() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      type,
      title,
      message,
      link,
      data,
    }: {
      userId: string;
      type: NotificationType;
      title: string;
      message?: string;
      link?: string;
      data?: Record<string, any>;
    }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: notificationId, error } = await supabase.rpc('create_notification', {
        _organization_id: organization.id,
        _user_id: userId,
        _type: type,
        _title: title,
        _message: message || null,
        _link: link || null,
        _data: data || {},
      });

      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
