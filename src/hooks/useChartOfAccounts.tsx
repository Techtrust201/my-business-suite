import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

export interface ChartAccount {
  id: string;
  organization_id: string;
  account_number: string;
  name: string;
  account_class: number;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parent_account_number: string | null;
  is_system: boolean;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChartAccountInput {
  account_number: string;
  name: string;
  account_class: number;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parent_account_number?: string | null;
  description?: string | null;
  is_active?: boolean;
}

// Fetch chart of accounts
export function useChartOfAccounts() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['chart-of-accounts', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('account_number', { ascending: true });

      if (error) throw error;
      return data as ChartAccount[];
    },
    enabled: !!organization?.id,
  });
}

// Fetch all accounts including inactive
export function useAllChartOfAccounts() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['chart-of-accounts-all', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .order('account_number', { ascending: true });

      if (error) throw error;
      return data as ChartAccount[];
    },
    enabled: !!organization?.id,
  });
}

// Get account by number
export function useAccountByNumber(accountNumber: string) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['chart-of-accounts', organization?.id, accountNumber],
    queryFn: async () => {
      if (!organization?.id || !accountNumber) return null;

      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('account_number', accountNumber)
        .single();

      if (error) throw error;
      return data as ChartAccount;
    },
    enabled: !!organization?.id && !!accountNumber,
  });
}

// Initialize chart of accounts
export function useInitChartOfAccounts() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error('No organization');

      const { error } = await supabase.rpc('init_chart_of_accounts', {
        _org_id: organization.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast({
        title: 'Plan comptable initialisé',
        description: 'Le Plan Comptable Général a été créé avec succès.',
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

// Create account
export function useCreateAccount() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: ChartAccountInput) => {
      if (!organization?.id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert({
          ...input,
          organization_id: organization.id,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast({
        title: 'Compte créé',
        description: 'Le compte comptable a été créé avec succès.',
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

// Update account
export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ChartAccountInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast({
        title: 'Compte modifié',
        description: 'Le compte comptable a été modifié avec succès.',
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

// Delete account
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', id)
        .eq('is_system', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast({
        title: 'Compte supprimé',
        description: 'Le compte comptable a été supprimé.',
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

// Helper: group accounts by class
export function groupAccountsByClass(accounts: ChartAccount[]) {
  const classNames: Record<number, string> = {
    1: 'Capitaux',
    2: 'Immobilisations',
    3: 'Stocks',
    4: 'Tiers',
    5: 'Financier',
    6: 'Charges',
    7: 'Produits',
    8: 'Comptes spéciaux',
  };

  const grouped = accounts.reduce((acc, account) => {
    const classKey = account.account_class;
    if (!acc[classKey]) {
      acc[classKey] = {
        class: classKey,
        name: classNames[classKey] || `Classe ${classKey}`,
        accounts: [],
      };
    }
    acc[classKey].accounts.push(account);
    return acc;
  }, {} as Record<number, { class: number; name: string; accounts: ChartAccount[] }>);

  return Object.values(grouped).sort((a, b) => a.class - b.class);
}

// Helper: build tree structure
export function buildAccountTree(accounts: ChartAccount[]) {
  const accountMap = new Map<string, ChartAccount & { children: ChartAccount[] }>();
  
  // First pass: create all nodes
  accounts.forEach(account => {
    accountMap.set(account.account_number, { ...account, children: [] });
  });
  
  // Second pass: build tree
  const roots: (ChartAccount & { children: ChartAccount[] })[] = [];
  
  accounts.forEach(account => {
    const node = accountMap.get(account.account_number)!;
    if (account.parent_account_number && accountMap.has(account.parent_account_number)) {
      accountMap.get(account.parent_account_number)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
}
