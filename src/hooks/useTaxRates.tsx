import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type TaxRate = Tables<'tax_rates'>;

export function useTaxRates() {
  return useQuery({
    queryKey: ['tax-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .order('rate', { ascending: true });

      if (error) throw error;
      return data as TaxRate[];
    },
  });
}

export function useCreateTaxRate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; rate: number; is_default?: boolean }) => {
      // Get user's organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Aucune organisation trouvée');
      }

      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('tax_rates')
          .update({ is_default: false })
          .eq('organization_id', profile.organization_id);
      }

      const { data: result, error } = await supabase
        .from('tax_rates')
        .insert({
          organization_id: profile.organization_id,
          name: data.name,
          rate: data.rate,
          is_default: data.is_default || false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      toast({
        title: 'Taux de TVA créé',
        description: 'Le taux a été ajouté avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de créer le taux: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTaxRate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; rate?: number; is_default?: boolean; is_active?: boolean }) => {
      // If setting as default, unset other defaults first
      if (data.is_default) {
        const { data: taxRate } = await supabase
          .from('tax_rates')
          .select('organization_id')
          .eq('id', id)
          .single();

        if (taxRate) {
          await supabase
            .from('tax_rates')
            .update({ is_default: false })
            .eq('organization_id', taxRate.organization_id)
            .neq('id', id);
        }
      }

      const { data: result, error } = await supabase
        .from('tax_rates')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      toast({
        title: 'Taux de TVA modifié',
        description: 'Le taux a été mis à jour avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de modifier le taux: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTaxRate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      toast({
        title: 'Taux de TVA supprimé',
        description: 'Le taux a été supprimé avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de supprimer le taux: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
