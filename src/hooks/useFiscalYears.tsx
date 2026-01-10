import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface FiscalYear {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  created_at: string;
}

export interface FiscalYearInput {
  name: string;
  start_date: string;
  end_date: string;
}

// Fetch fiscal years
export function useFiscalYears() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['fiscal-years', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .eq('organization_id', organization.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data as FiscalYear[];
    },
    enabled: !!organization?.id,
  });
}

// Get current fiscal year
export function useCurrentFiscalYear() {
  const { organization } = useOrganization();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['fiscal-year-current', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;

      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .eq('organization_id', organization.id)
        .lte('start_date', today)
        .gte('end_date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as FiscalYear | null;
    },
    enabled: !!organization?.id,
  });
}

// Create fiscal year
export function useCreateFiscalYear() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: FiscalYearInput) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('fiscal_years')
        .insert({
          ...input,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast({
        title: 'Exercice créé',
        description: 'L\'exercice comptable a été créé avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Close fiscal year
export function useCloseFiscalYear() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fiscal_years')
        .update({
          is_closed: true,
          closed_at: new Date().toISOString(),
          closed_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast({
        title: 'Exercice clôturé',
        description: 'L\'exercice comptable a été clôturé.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete fiscal year
export function useDeleteFiscalYear() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fiscal_years')
        .delete()
        .eq('id', id)
        .eq('is_closed', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast({
        title: 'Exercice supprimé',
        description: 'L\'exercice comptable a été supprimé.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
