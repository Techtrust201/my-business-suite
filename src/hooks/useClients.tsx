import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type Contact = Tables<'contacts'>;
export type ContactInsert = TablesInsert<'contacts'>;
export type ContactUpdate = TablesUpdate<'contacts'>;

export type ContactType = 'client' | 'supplier' | 'both';

interface UseClientsOptions {
  type?: ContactType | 'all';
  search?: string;
  isActive?: boolean;
}

export function useClients(options: UseClientsOptions = {}) {
  const { type = 'all', search = '', isActive } = options;
  const queryClient = useQueryClient();

  // Realtime subscription for contacts
  useEffect(() => {
    const channel = supabase
      .channel('contacts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['contacts', { type, search, isActive }],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('*')
        .order('company_name', { ascending: true, nullsFirst: false })
        .order('last_name', { ascending: true });

      if (type !== 'all') {
        if (type === 'client') {
          query = query.in('type', ['client', 'both']);
        } else if (type === 'supplier') {
          query = query.in('type', ['supplier', 'both']);
        }
      }

      if (search) {
        query = query.or(`company_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Contact[];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (contact: Omit<ContactInsert, 'organization_id'>) => {
      // Get user's organization_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('No organization found');
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contact, organization_id: profile.organization_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Contact créé',
        description: 'Le contact a été ajouté avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le contact.',
        variant: 'destructive',
      });
      console.error('Create contact error:', error);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...contact }: ContactUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(contact)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Contact modifié',
        description: 'Le contact a été mis à jour avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le contact.',
        variant: 'destructive',
      });
      console.error('Update contact error:', error);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({
        title: 'Contact supprimé',
        description: 'Le contact a été supprimé avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le contact.',
        variant: 'destructive',
      });
      console.error('Delete contact error:', error);
    },
  });
}
