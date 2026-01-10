import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface AccountingKpis {
  // Cash flow
  monthlyReceipts: number; // Encaissements du mois
  monthlyDisbursements: number; // Décaissements du mois
  monthlyBalance: number; // Solde du mois (encaissements - décaissements)
  
  // Treasury
  bankBalance: number; // Solde banque (compte 512)
  cashBalance: number; // Solde caisse (compte 530)
  totalTreasury: number; // Trésorerie totale
  
  // VAT
  vatCollected: number; // TVA collectée (compte 44571)
  vatDeductible: number; // TVA déductible (compte 44566)
  vatToPay: number; // TVA à payer
  
  // Results
  monthlyRevenue: number; // CA du mois (compte 7xx)
  monthlyExpenses: number; // Charges du mois (compte 6xx)
  monthlyResult: number; // Résultat du mois
  
  // YTD
  ytdRevenue: number;
  ytdExpenses: number;
  ytdResult: number;
}

interface MonthlyTrend {
  month: string;
  monthLabel: string;
  receipts: number;
  disbursements: number;
  balance: number;
}

export function useAccountingKpis() {
  return useQuery({
    queryKey: ['accounting-kpis'],
    queryFn: async (): Promise<AccountingKpis> => {
      const now = new Date();
      const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
      const yearStart = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');

      // Get organization ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        return getEmptyKpis();
      }

      // Fetch journal entry lines with account info for current month
      const { data: monthlyLines } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          journal_entry:journal_entries!inner(date, status, organization_id)
        `)
        .eq('journal_entry.organization_id', profile.organization_id)
        .eq('journal_entry.status', 'posted')
        .gte('journal_entry.date', currentMonthStart)
        .lte('journal_entry.date', currentMonthEnd);

      // Fetch all posted journal entry lines for balances
      const { data: allLines } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          journal_entry:journal_entries!inner(date, status, organization_id)
        `)
        .eq('journal_entry.organization_id', profile.organization_id)
        .eq('journal_entry.status', 'posted');

      // Fetch YTD lines
      const { data: ytdLines } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          journal_entry:journal_entries!inner(date, status, organization_id)
        `)
        .eq('journal_entry.organization_id', profile.organization_id)
        .eq('journal_entry.status', 'posted')
        .gte('journal_entry.date', yearStart);

      // Fetch chart of accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_number, name')
        .eq('organization_id', profile.organization_id);

      const accountMap = new Map(accounts?.map(a => [a.id, a]) || []);

      // Helper to calculate balance by account prefix
      const calculateBalanceByPrefix = (lines: any[], prefix: string) => {
        let debitTotal = 0;
        let creditTotal = 0;
        
        lines?.forEach(line => {
          const account = accountMap.get(line.account_id);
          if (account?.account_number?.startsWith(prefix)) {
            debitTotal += Number(line.debit || 0);
            creditTotal += Number(line.credit || 0);
          }
        });
        
        return { debitTotal, creditTotal, balance: debitTotal - creditTotal };
      };

      // Monthly calculations
      const monthlyBank = calculateBalanceByPrefix(monthlyLines || [], '512');
      const monthlyReceipts = monthlyBank.debitTotal; // Entrées sur compte banque
      const monthlyDisbursements = monthlyBank.creditTotal; // Sorties du compte banque

      // Treasury balances (all time)
      const bankBalance = calculateBalanceByPrefix(allLines || [], '512').balance;
      const cashBalance = calculateBalanceByPrefix(allLines || [], '530').balance;

      // VAT balances
      const vatCollectedBalance = calculateBalanceByPrefix(allLines || [], '44571');
      const vatCollected = vatCollectedBalance.creditTotal - vatCollectedBalance.debitTotal;
      
      const vatDeductibleBalance = calculateBalanceByPrefix(allLines || [], '44566');
      const vatDeductible = vatDeductibleBalance.debitTotal - vatDeductibleBalance.creditTotal;

      // Monthly revenue (class 7) and expenses (class 6)
      const monthlyRevenueCalc = calculateBalanceByPrefix(monthlyLines || [], '7');
      const monthlyRevenue = monthlyRevenueCalc.creditTotal - monthlyRevenueCalc.debitTotal;
      
      const monthlyExpensesCalc = calculateBalanceByPrefix(monthlyLines || [], '6');
      const monthlyExpenses = monthlyExpensesCalc.debitTotal - monthlyExpensesCalc.creditTotal;

      // YTD calculations
      const ytdRevenueCalc = calculateBalanceByPrefix(ytdLines || [], '7');
      const ytdRevenue = ytdRevenueCalc.creditTotal - ytdRevenueCalc.debitTotal;
      
      const ytdExpensesCalc = calculateBalanceByPrefix(ytdLines || [], '6');
      const ytdExpenses = ytdExpensesCalc.debitTotal - ytdExpensesCalc.creditTotal;

      return {
        monthlyReceipts,
        monthlyDisbursements,
        monthlyBalance: monthlyReceipts - monthlyDisbursements,
        bankBalance,
        cashBalance,
        totalTreasury: bankBalance + cashBalance,
        vatCollected,
        vatDeductible,
        vatToPay: vatCollected - vatDeductible,
        monthlyRevenue,
        monthlyExpenses,
        monthlyResult: monthlyRevenue - monthlyExpenses,
        ytdRevenue,
        ytdExpenses,
        ytdResult: ytdRevenue - ytdExpenses,
      };
    },
  });
}

export function useTreasuryTrend() {
  return useQuery({
    queryKey: ['treasury-trend'],
    queryFn: async (): Promise<MonthlyTrend[]> => {
      const now = new Date();
      const months: MonthlyTrend[] = [];

      // Get organization ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        return [];
      }

      // Fetch chart of accounts for bank accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_number')
        .eq('organization_id', profile.organization_id)
        .like('account_number', '512%');

      const bankAccountIds = accounts?.map(a => a.id) || [];

      // Get last 6 months data
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
        const monthLabel = format(monthDate, 'MMM');

        // Fetch journal entry lines for this month
        const { data: lines } = await supabase
          .from('journal_entry_lines')
          .select(`
            account_id,
            debit,
            credit,
            journal_entry:journal_entries!inner(date, status, organization_id)
          `)
          .eq('journal_entry.organization_id', profile.organization_id)
          .eq('journal_entry.status', 'posted')
          .gte('journal_entry.date', monthStart)
          .lte('journal_entry.date', monthEnd)
          .in('account_id', bankAccountIds.length > 0 ? bankAccountIds : ['00000000-0000-0000-0000-000000000000']);

        let receipts = 0;
        let disbursements = 0;

        lines?.forEach(line => {
          receipts += Number(line.debit || 0);
          disbursements += Number(line.credit || 0);
        });

        months.push({
          month: format(monthDate, 'yyyy-MM'),
          monthLabel,
          receipts,
          disbursements,
          balance: receipts - disbursements,
        });
      }

      return months;
    },
  });
}

function getEmptyKpis(): AccountingKpis {
  return {
    monthlyReceipts: 0,
    monthlyDisbursements: 0,
    monthlyBalance: 0,
    bankBalance: 0,
    cashBalance: 0,
    totalTreasury: 0,
    vatCollected: 0,
    vatDeductible: 0,
    vatToPay: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    monthlyResult: 0,
    ytdRevenue: 0,
    ytdExpenses: 0,
    ytdResult: 0,
  };
}
