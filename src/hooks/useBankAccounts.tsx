import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';

export interface BankAccount {
  id: string;
  organization_id: string;
  name: string;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  account_number: string | null;
  account_holder: string | null;
  initial_balance: number | null;
  current_balance: number | null;
  is_default: boolean | null;
  is_active: boolean | null;
  currency: string | null;
  chart_account_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BankAccountInput {
  name: string;
  bank_name?: string;
  iban?: string;
  bic?: string;
  account_number?: string;
  account_holder?: string;
  initial_balance?: number;
  is_default?: boolean;
  is_active?: boolean;
  currency?: string;
}

export function useBankAccounts() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['bank-accounts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching bank accounts:', error);
        return [];
      }

      return data as BankAccount[];
    },
    enabled: !!organization?.id,
  });
}

export function useActiveBankAccounts() {
  const { data: accounts, ...rest } = useBankAccounts();
  return {
    data: accounts?.filter((a) => a.is_active),
    ...rest,
  };
}

export function useDefaultBankAccount() {
  const { data: accounts, ...rest } = useBankAccounts();
  return {
    data: accounts?.find((a) => a.is_default) || accounts?.[0],
    ...rest,
  };
}

export function useCreateBankAccount() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BankAccountInput) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          organization_id: organization.id,
          name: input.name,
          bank_name: input.bank_name,
          iban: input.iban,
          bic: input.bic,
          account_number: input.account_number,
          account_holder: input.account_holder,
          initial_balance: input.initial_balance ?? 0,
          is_default: input.is_default ?? false,
          is_active: input.is_active ?? true,
          currency: input.currency ?? 'EUR',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Compte bancaire créé');
    },
    onError: (error) => {
      console.error('Error creating bank account:', error);
      toast.error('Erreur lors de la création du compte');
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: BankAccountInput & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update({
          name: input.name,
          bank_name: input.bank_name,
          iban: input.iban,
          bic: input.bic,
          account_number: input.account_number,
          account_holder: input.account_holder,
          initial_balance: input.initial_balance,
          is_default: input.is_default,
          is_active: input.is_active,
          currency: input.currency,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Compte bancaire mis à jour');
    },
    onError: (error) => {
      console.error('Error updating bank account:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Compte bancaire supprimé');
    },
    onError: (error) => {
      console.error('Error deleting bank account:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}

export function useSetDefaultBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Compte par défaut défini');
    },
    onError: (error) => {
      console.error('Error setting default bank account:', error);
      toast.error('Erreur lors de la définition du compte par défaut');
    },
  });
}

export function useBankAccount(accountId?: string) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['bank-account', accountId],
    queryFn: async () => {
      if (!accountId || !organization?.id) return null;

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('organization_id', organization.id)
        .single();

      if (error) {
        console.error('Error fetching bank account:', error);
        return null;
      }

      return data as BankAccount | null;
    },
    enabled: !!accountId && !!organization?.id,
  });
}
