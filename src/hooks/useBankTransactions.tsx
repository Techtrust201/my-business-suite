import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { generatePaymentReceivedEntry, generateBillPaymentEntry } from '@/hooks/useAccountingEntries';

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
    staleTime: 0, // Toujours considérer comme périmé
    refetchOnWindowFocus: true,
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

      // Dédupliquer les transactions du fichier lui-même (même hash dans le même batch)
      const uniqueNewTransactions = newTransactions.filter(
        (t, index, self) =>
          index === self.findIndex((other) => other.import_hash === t.import_hash)
      );

      if (uniqueNewTransactions.length === 0) {
        return { inserted: 0, skipped: transactions.length };
      }

      const transactionsWithOrg = uniqueNewTransactions.map((t) => ({
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
        skipped: transactions.length - uniqueNewTransactions.length,
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
      paymentAmount,
    }: {
      transactionId: string;
      invoiceId?: string;
      billId?: string;
      paymentAmount?: number;
    }) => {
      if (!organization?.id) throw new Error('Organization not found');

      // Récupérer les détails de la transaction
      const { data: transaction } = await supabase
        .from('bank_transactions')
        .select('date')
        .eq('id', transactionId)
        .single();

      const transactionDate = transaction?.date || new Date().toISOString().split('T')[0];

      // 1. Marquer la transaction comme rapprochée
      const { error: txError } = await supabase
        .from('bank_transactions')
        .update({
          is_reconciled: true,
          matched_invoice_id: invoiceId || null,
          matched_bill_id: billId || null,
        })
        .eq('id', transactionId);

      if (txError) throw txError;

      // 2. Mettre à jour la facture client si liée
      if (invoiceId && paymentAmount) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, number, total, amount_paid')
          .eq('id', invoiceId)
          .single();

        if (invoice) {
          const newAmountPaid = Number(invoice.amount_paid || 0) + paymentAmount;
          const total = Number(invoice.total);
          const newStatus = newAmountPaid >= total ? 'paid' : 'partially_paid';

          const { error: invError } = await supabase
            .from('invoices')
            .update({
              amount_paid: newAmountPaid,
              status: newStatus,
              paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
            })
            .eq('id', invoiceId);

          if (invError) throw invError;

          // Générer l'écriture comptable de paiement
          await generatePaymentReceivedEntry(
            organization.id,
            transactionId, // On utilise l'ID de transaction comme référence
            invoice.number,
            transactionDate,
            paymentAmount
          );
        }
      }

      // 3. Mettre à jour la facture fournisseur si liée
      if (billId && paymentAmount) {
        const { data: bill } = await supabase
          .from('bills')
          .select('id, number, total, amount_paid, vendor_reference')
          .eq('id', billId)
          .single();

        if (bill) {
          const newAmountPaid = Number(bill.amount_paid || 0) + paymentAmount;
          const total = Number(bill.total);
          const newStatus = newAmountPaid >= total ? 'paid' : 'partially_paid';

          const { error: billError } = await supabase
            .from('bills')
            .update({
              amount_paid: newAmountPaid,
              status: newStatus,
              paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
            })
            .eq('id', billId);

          if (billError) throw billError;

          // Générer l'écriture comptable de paiement fournisseur
          await generateBillPaymentEntry(
            organization.id,
            transactionId,
            bill.number || bill.vendor_reference,
            transactionDate,
            paymentAmount
          );
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-kpis'] });
      toast.success('Transaction rapprochée et paiement enregistré');
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

