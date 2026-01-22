import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export interface ProspectStatus {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  icon: string | null;
  position: number;
  is_default: boolean;
  is_final_positive: boolean;
  is_final_negative: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProspectStatusInsert = Omit<ProspectStatus, 'id' | 'created_at' | 'updated_at'>;
export type ProspectStatusUpdate = Partial<Omit<ProspectStatus, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;

export function useProspectStatuses() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect-statuses', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('prospect_statuses')
        .select('*')
        .eq('organization_id', organization.id)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as ProspectStatus[];
    },
    enabled: !!organization?.id,
  });
}

export function useActiveProspectStatuses() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect-statuses-active', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('prospect_statuses')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as ProspectStatus[];
    },
    enabled: !!organization?.id,
  });
}

export function useInitProspectStatuses() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error('No organization');

      const { error } = await supabase.rpc('init_prospect_statuses', {
        _org_id: organization.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-statuses'] });
      toast.success('Statuts initialisés avec succès');
    },
    onError: (error) => {
      toast.error("Erreur lors de l'initialisation des statuts");
      console.error(error);
    },
  });
}

export function useCreateProspectStatus() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: Omit<ProspectStatusInsert, 'organization_id'>) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('prospect_statuses')
        .insert({
          ...status,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-statuses'] });
      toast.success('Statut créé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création du statut');
      console.error(error);
    },
  });
}

export function useUpdateProspectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProspectStatusUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('prospect_statuses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-statuses'] });
      toast.success('Statut mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });
}

export function useDeleteProspectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prospect_statuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-statuses'] });
      toast.success('Statut supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    },
  });
}

export function useSetDefaultProspectStatus() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) throw new Error('No organization');

      // Reset all defaults first
      await supabase
        .from('prospect_statuses')
        .update({ is_default: false })
        .eq('organization_id', organization.id);

      // Set the new default
      const { error } = await supabase
        .from('prospect_statuses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-statuses'] });
      toast.success('Statut par défaut mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });
}
