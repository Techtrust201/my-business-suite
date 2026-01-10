import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type BankAccount = Tables<'bank_accounts'>;
export type BankAccountInsert = TablesInsert<'bank_accounts'>;
export type BankAccountUpdate = TablesUpdate<'bank_accounts'>;
type BankTransaction = Tables<'bank_transactions'>;

export function useBankAccounts() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const {
    data: bankAccounts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['bank_accounts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!organization?.id,
    staleTime: 0, // Toujours considérer comme périmé
    refetchOnWindowFocus: true,
  });

  const createBankAccount = useMutation({
    mutationFn: async (account: Omit<BankAccountInsert, 'organization_id'>) => {
      if (!organization?.id) throw new Error('Organization not found');

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          ...account,
          organization_id: organization.id,
          current_balance: account.initial_balance || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Compte bancaire créé avec succès');
    },
    onError: (error) => {
      console.error('Error creating bank account:', error);
      toast.error('Erreur lors de la création du compte');
    },
  });

  const updateBankAccount = useMutation({
    mutationFn: async ({ id, ...updates }: BankAccountUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank_account'] });
      toast.success('Compte bancaire mis à jour');
    },
    onError: (error) => {
      console.error('Error updating bank account:', error);
      toast.error('Erreur lors de la mise à jour du compte');
    },
  });

  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    // Mise à jour optimiste : l'UI se met à jour AVANT la réponse du serveur
    onMutate: async (id: string) => {
      // Annuler les queries en cours pour éviter les conflits
      await queryClient.cancelQueries({ queryKey: ['bank_accounts'] });
      await queryClient.cancelQueries({ queryKey: ['bank_transactions'] });

      // Snapshot des données actuelles (pour rollback en cas d'erreur)
      const previousAccounts = queryClient.getQueryData(['bank_accounts', organization?.id]);
      const previousTransactions = queryClient.getQueryData(['bank_transactions', organization?.id, undefined, undefined]);

      // Mettre à jour le cache immédiatement
      queryClient.setQueryData(
        ['bank_accounts', organization?.id],
        (old: BankAccount[] | undefined) => old?.filter((a) => a.id !== id) || []
      );

      // Supprimer les transactions du compte du cache
      queryClient.setQueriesData(
        { queryKey: ['bank_transactions'] },
        (old: BankTransaction[] | undefined) => old?.filter((t) => t.bank_account_id !== id) || []
      );

      return { previousAccounts, previousTransactions };
    },
    onSuccess: () => {
      toast.success('Compte bancaire supprimé');
    },
    onError: (error, _id, context) => {
      // Rollback en cas d'erreur
      if (context?.previousAccounts) {
        queryClient.setQueryData(['bank_accounts', organization?.id], context.previousAccounts);
      }
      console.error('Error deleting bank account:', error);
      toast.error('Erreur lors de la suppression du compte');
    },
    onSettled: () => {
      // Toujours revalider après (pour s'assurer de la cohérence)
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
    },
  });

  // Calcul des totaux
  const totalBalance = bankAccounts
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + (a.current_balance || 0), 0);

  return {
    bankAccounts,
    isLoading,
    error,
    totalBalance,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
  };
}

export function useBankAccount(id: string | undefined) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['bank_account', id],
    queryFn: async () => {
      if (!id || !organization?.id) return null;

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      return data as BankAccount;
    },
    enabled: !!id && !!organization?.id,
  });
}

