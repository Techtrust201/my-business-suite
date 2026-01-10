import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type BankTransaction = Tables<'bank_transactions'>;
export type BankTransactionInsert = TablesInsert<'bank_transactions'>;
export type BankTransactionUpdate = TablesUpdate<'bank_transactions'>;

interface UseBankTransactionsOptions {
  bankAccountId?: string;
  isReconciled?: boolean;
  limit?: number;
}

export function useBankTransactions(options: UseBankTransactionsOptions = {}) {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const { bankAccountId, isReconciled, limit } = options;

  const {
    data: transactions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['bank_transactions', organization?.id, bankAccountId, isReconciled],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('bank_transactions')
        .select('*')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });

      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId);
      }

      if (isReconciled !== undefined) {
        query = query.eq('is_reconciled', isReconciled);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BankTransaction[];
    },
    enabled: !!organization?.id,
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<BankTransactionInsert, 'organization_id'>) => {
      if (!organization?.id) throw new Error('Organization not found');

      const { data, error } = await supabase
        .from('bank_transactions')
        .insert({
          ...transaction,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
    },
    onError: (error) => {
      console.error('Error creating transaction:', error);
      toast.error('Erreur lors de la création de la transaction');
    },
  });

  const createManyTransactions = useMutation({
    mutationFn: async (transactions: Omit<BankTransactionInsert, 'organization_id'>[]) => {
      if (!organization?.id) throw new Error('Organization not found');

      // Récupérer les import_hash existants pour filtrer les doublons
      const hashes = transactions
        .map((t) => t.import_hash)
        .filter((h): h is string => !!h);
      
      let existingHashes: string[] = [];
      if (hashes.length > 0) {
        const { data: existingData } = await supabase
          .from('bank_transactions')
          .select('import_hash')
          .eq('organization_id', organization.id)
          .in('import_hash', hashes);
        
        existingHashes = (existingData || [])
          .map((d) => d.import_hash)
          .filter((h): h is string => !!h);
      }

      // Filtrer les transactions déjà existantes
      const newTransactions = transactions.filter(
        (t) => !t.import_hash || !existingHashes.includes(t.import_hash)
      );

      if (newTransactions.length === 0) {
        return { inserted: 0, skipped: transactions.length };
      }

      const transactionsWithOrg = newTransactions.map((t) => ({
        ...t,
        organization_id: organization.id,
      }));

      const { data, error } = await supabase
        .from('bank_transactions')
        .insert(transactionsWithOrg)
        .select();

      if (error) throw error;
      return { 
        inserted: data.length, 
        skipped: transactions.length - newTransactions.length,
        data 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      if (result.skipped > 0) {
        toast.success(`${result.inserted} transactions importées (${result.skipped} doublons ignorés)`);
      } else {
        toast.success(`${result.inserted} transactions importées avec succès`);
      }
    },
    onError: (error) => {
      console.error('Error importing transactions:', error);
      toast.error('Erreur lors de l\'import des transactions');
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, ...updates }: BankTransactionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
    },
    onError: (error) => {
      console.error('Error updating transaction:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Transaction supprimée');
    },
    onError: (error) => {
      console.error('Error deleting transaction:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  const reconcileTransaction = useMutation({
    mutationFn: async ({
      transactionId,
      invoiceId,
      billId,
      paymentId,
    }: {
      transactionId: string;
      invoiceId?: string;
      billId?: string;
      paymentId?: string;
    }) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update({
          is_reconciled: true,
          matched_invoice_id: invoiceId || null,
          matched_bill_id: billId || null,
          matched_payment_id: paymentId || null,
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
      toast.success('Transaction rapprochée');
    },
    onError: (error) => {
      console.error('Error reconciling transaction:', error);
      toast.error('Erreur lors du rapprochement');
    },
  });

  const unreconcileTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .update({
          is_reconciled: false,
          matched_invoice_id: null,
          matched_bill_id: null,
          matched_payment_id: null,
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
      toast.success('Rapprochement annulé');
    },
    onError: (error) => {
      console.error('Error unreconciling transaction:', error);
      toast.error('Erreur lors de l\'annulation');
    },
  });

  // Stats
  const unreconciledCount = transactions.filter((t) => !t.is_reconciled).length;
  const totalCredits = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    transactions,
    isLoading,
    error,
    unreconciledCount,
    totalCredits,
    totalDebits,
    createTransaction,
    createManyTransactions,
    updateTransaction,
    deleteTransaction,
    reconcileTransaction,
    unreconcileTransaction,
  };
}

