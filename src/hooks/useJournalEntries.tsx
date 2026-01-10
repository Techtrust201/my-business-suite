import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface JournalEntry {
  id: string;
  organization_id: string;
  entry_number: string;
  date: string;
  description: string;
  reference_type: 'invoice' | 'bill' | 'payment' | 'bill_payment' | 'bank_transaction' | 'manual' | null;
  reference_id: string | null;
  journal_type: 'sales' | 'purchases' | 'bank' | 'general';
  status: 'draft' | 'posted' | 'cancelled';
  is_balanced: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description: string | null;
  debit: number;
  credit: number;
  position: number;
  created_at: string;
  account?: {
    id: string;
    account_number: string;
    name: string;
  };
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: JournalEntryLine[];
}

export interface JournalEntryLineInput {
  account_id: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalEntryInput {
  date: string;
  description: string;
  reference_type?: 'invoice' | 'bill' | 'payment' | 'bill_payment' | 'bank_transaction' | 'manual';
  reference_id?: string;
  journal_type: 'sales' | 'purchases' | 'bank' | 'general';
  lines: JournalEntryLineInput[];
}

// Fetch journal entries
export function useJournalEntries(options?: {
  journalType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['journal-entries', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false })
        .order('entry_number', { ascending: false });

      if (options?.journalType) {
        query = query.eq('journal_type', options.journalType);
      }
      if (options?.startDate) {
        query = query.gte('date', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('date', options.endDate);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as JournalEntry[];
    },
    enabled: !!organization?.id,
  });
}

// Fetch single journal entry with lines
export function useJournalEntry(id: string | null) {
  return useQuery({
    queryKey: ['journal-entry', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id)
        .single();

      if (entryError) throw entryError;

      const { data: lines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          account:chart_of_accounts(id, account_number, name)
        `)
        .eq('journal_entry_id', id)
        .order('position', { ascending: true });

      if (linesError) throw linesError;

      return {
        ...entry,
        lines: lines || [],
      } as JournalEntryWithLines;
    },
    enabled: !!id,
  });
}

// Create journal entry
export function useCreateJournalEntry() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: JournalEntryInput) => {
      if (!organization?.id) throw new Error('No organization');

      // Validate balance
      const totalDebit = input.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = input.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`L'écriture n'est pas équilibrée. Débit: ${totalDebit.toFixed(2)}€, Crédit: ${totalCredit.toFixed(2)}€`);
      }

      // Get next entry number
      const { data: entryNumber, error: numError } = await supabase.rpc(
        'get_next_journal_entry_number',
        { _org_id: organization.id }
      );

      if (numError) throw numError;

      // Create entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          organization_id: organization.id,
          entry_number: entryNumber,
          date: input.date,
          description: input.description,
          reference_type: input.reference_type || 'manual',
          reference_id: input.reference_id,
          journal_type: input.journal_type,
          status: 'posted',
          is_balanced: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create lines
      const linesToInsert = input.lines.map((line, index) => ({
        journal_entry_id: entry.id,
        account_id: line.account_id,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
        position: index,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesToInsert);

      if (linesError) throw linesError;

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['general-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      toast({
        title: 'Écriture créée',
        description: 'L\'écriture comptable a été enregistrée.',
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

// Cancel journal entry
export function useCancelJournalEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('journal_entries')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['general-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      toast({
        title: 'Écriture annulée',
        description: 'L\'écriture comptable a été annulée.',
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

// General Ledger (Grand Livre)
export function useGeneralLedger(options?: {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['general-ledger', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          *,
          account:chart_of_accounts(id, account_number, name, account_type),
          journal_entry:journal_entries!inner(
            id, entry_number, date, description, status, organization_id
          )
        `)
        .eq('journal_entry.organization_id', organization.id)
        .eq('journal_entry.status', 'posted')
        .order('journal_entry(date)', { ascending: true });

      if (options?.accountId) {
        query = query.eq('account_id', options.accountId);
      }
      if (options?.startDate) {
        query = query.gte('journal_entry.date', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('journal_entry.date', options.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}

// Trial Balance (Balance Générale)
export function useTrialBalance(options?: {
  date?: string;
}) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['trial-balance', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('account_number', { ascending: true });

      if (accountsError) throw accountsError;

      // Get all posted entries with lines
      let linesQuery = supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          journal_entry:journal_entries!inner(date, status, organization_id)
        `)
        .eq('journal_entry.organization_id', organization.id)
        .eq('journal_entry.status', 'posted');

      if (options?.date) {
        linesQuery = linesQuery.lte('journal_entry.date', options.date);
      }

      const { data: lines, error: linesError } = await linesQuery;

      if (linesError) throw linesError;

      // Calculate balances
      const balances = new Map<string, { debit: number; credit: number }>();
      
      (lines || []).forEach((line: any) => {
        const current = balances.get(line.account_id) || { debit: 0, credit: 0 };
        balances.set(line.account_id, {
          debit: current.debit + (line.debit || 0),
          credit: current.credit + (line.credit || 0),
        });
      });

      // Build result
      const result = (accounts || [])
        .map(account => {
          const balance = balances.get(account.id) || { debit: 0, credit: 0 };
          const solde = balance.debit - balance.credit;
          return {
            ...account,
            total_debit: balance.debit,
            total_credit: balance.credit,
            solde_debit: solde > 0 ? solde : 0,
            solde_credit: solde < 0 ? -solde : 0,
          };
        })
        .filter(a => a.total_debit !== 0 || a.total_credit !== 0);

      return result;
    },
    enabled: !!organization?.id,
  });
}

// Account balance
export function useAccountBalance(accountId: string | null, date?: string) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['account-balance', organization?.id, accountId, date],
    queryFn: async () => {
      if (!organization?.id || !accountId) return { debit: 0, credit: 0, balance: 0 };

      let query = supabase
        .from('journal_entry_lines')
        .select(`
          debit,
          credit,
          journal_entry:journal_entries!inner(date, status, organization_id)
        `)
        .eq('account_id', accountId)
        .eq('journal_entry.organization_id', organization.id)
        .eq('journal_entry.status', 'posted');

      if (date) {
        query = query.lte('journal_entry.date', date);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totals = (data || []).reduce(
        (acc: { debit: number; credit: number }, line: any) => ({
          debit: acc.debit + (line.debit || 0),
          credit: acc.credit + (line.credit || 0),
        }),
        { debit: 0, credit: 0 }
      );

      return {
        ...totals,
        balance: totals.debit - totals.credit,
      };
    },
    enabled: !!organization?.id && !!accountId,
  });
}
