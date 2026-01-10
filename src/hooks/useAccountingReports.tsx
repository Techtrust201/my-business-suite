import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface BalanceSheetData {
  assets: {
    fixed: { accounts: AccountBalance[]; total: number };
    current: { accounts: AccountBalance[]; total: number };
    cash: { accounts: AccountBalance[]; total: number };
    total: number;
  };
  liabilities: {
    equity: { accounts: AccountBalance[]; total: number };
    provisions: { accounts: AccountBalance[]; total: number };
    debts: { accounts: AccountBalance[]; total: number };
    total: number;
  };
}

export interface IncomeStatementData {
  income: {
    sales: { accounts: AccountBalance[]; total: number };
    other: { accounts: AccountBalance[]; total: number };
    total: number;
  };
  expenses: {
    purchases: { accounts: AccountBalance[]; total: number };
    external: { accounts: AccountBalance[]; total: number };
    personnel: { accounts: AccountBalance[]; total: number };
    taxes: { accounts: AccountBalance[]; total: number };
    other: { accounts: AccountBalance[]; total: number };
    total: number;
  };
  result: number;
}

export interface VatReportData {
  collected: { accounts: AccountBalance[]; total: number };
  deductible: { accounts: AccountBalance[]; total: number };
  balance: number; // positive = à payer, negative = crédit
}

export interface AccountBalance {
  id: string;
  account_number: string;
  name: string;
  balance: number;
}

// Balance Sheet (Bilan)
export function useBalanceSheet(date?: string) {
  const { organization } = useOrganization();
  const asOfDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['balance-sheet', organization?.id, asOfDate],
    queryFn: async (): Promise<BalanceSheetData> => {
      if (!organization?.id) {
        return getEmptyBalanceSheet();
      }

      // Get all accounts with their balances
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .in('account_class', [1, 2, 3, 4, 5]);

      if (accountsError) throw accountsError;

      // Get all posted entry lines up to date
      const { data: lines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          journal_entry:journal_entries!inner(date, status, organization_id)
        `)
        .eq('journal_entry.organization_id', organization.id)
        .eq('journal_entry.status', 'posted')
        .lte('journal_entry.date', asOfDate);

      if (linesError) throw linesError;

      // Calculate balances
      const balances = new Map<string, number>();
      (lines || []).forEach((line: any) => {
        const current = balances.get(line.account_id) || 0;
        balances.set(line.account_id, current + (line.debit || 0) - (line.credit || 0));
      });

      // Build balance sheet structure
      const getAccountsWithBalance = (classFilter: number[], typeFilter?: string): AccountBalance[] => {
        return (accounts || [])
          .filter(a => classFilter.includes(a.account_class) && (!typeFilter || a.account_type === typeFilter))
          .map(a => ({
            id: a.id,
            account_number: a.account_number,
            name: a.name,
            balance: balances.get(a.id) || 0,
          }))
          .filter(a => Math.abs(a.balance) > 0.01);
      };

      // Assets (Actif)
      const fixedAssets = getAccountsWithBalance([2]);
      const currentAssets = getAccountsWithBalance([3, 4], 'asset');
      const cashAssets = getAccountsWithBalance([5]);

      // Liabilities (Passif)
      const equity = getAccountsWithBalance([1]);
      const provisions = getAccountsWithBalance([1]).filter(a => a.account_number.startsWith('15'));
      const debts = getAccountsWithBalance([4], 'liability');

      const sumBalances = (items: AccountBalance[]) => items.reduce((sum, a) => sum + a.balance, 0);

      return {
        assets: {
          fixed: { accounts: fixedAssets, total: sumBalances(fixedAssets) },
          current: { accounts: currentAssets, total: sumBalances(currentAssets) },
          cash: { accounts: cashAssets, total: sumBalances(cashAssets) },
          total: sumBalances(fixedAssets) + sumBalances(currentAssets) + sumBalances(cashAssets),
        },
        liabilities: {
          equity: { accounts: equity, total: Math.abs(sumBalances(equity)) },
          provisions: { accounts: provisions, total: Math.abs(sumBalances(provisions)) },
          debts: { accounts: debts, total: Math.abs(sumBalances(debts)) },
          total: Math.abs(sumBalances(equity)) + Math.abs(sumBalances(provisions)) + Math.abs(sumBalances(debts)),
        },
      };
    },
    enabled: !!organization?.id,
  });
}

// Income Statement (Compte de Résultat)
export function useIncomeStatement(startDate?: string, endDate?: string) {
  const { organization } = useOrganization();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const end = endDate || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['income-statement', organization?.id, start, end],
    queryFn: async (): Promise<IncomeStatementData> => {
      if (!organization?.id) {
        return getEmptyIncomeStatement();
      }

      // Get class 6 and 7 accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .in('account_class', [6, 7]);

      if (accountsError) throw accountsError;

      // Get posted entry lines for the period
      const { data: lines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          journal_entry:journal_entries!inner(date, status, organization_id)
        `)
        .eq('journal_entry.organization_id', organization.id)
        .eq('journal_entry.status', 'posted')
        .gte('journal_entry.date', start)
        .lte('journal_entry.date', end);

      if (linesError) throw linesError;

      // Calculate balances
      const balances = new Map<string, number>();
      (lines || []).forEach((line: any) => {
        const current = balances.get(line.account_id) || 0;
        // For income/expense: credit - debit for income (class 7), debit - credit for expenses (class 6)
        balances.set(line.account_id, current + (line.debit || 0) - (line.credit || 0));
      });

      const getAccountsWithBalance = (filter: (a: any) => boolean): AccountBalance[] => {
        return (accounts || [])
          .filter(filter)
          .map(a => ({
            id: a.id,
            account_number: a.account_number,
            name: a.name,
            balance: Math.abs(balances.get(a.id) || 0),
          }))
          .filter(a => a.balance > 0.01);
      };

      // Income (Produits - Class 7)
      const sales = getAccountsWithBalance(a => a.account_class === 7 && a.account_number.startsWith('70'));
      const otherIncome = getAccountsWithBalance(a => a.account_class === 7 && !a.account_number.startsWith('70'));

      // Expenses (Charges - Class 6)
      const purchases = getAccountsWithBalance(a => a.account_number.startsWith('60'));
      const external = getAccountsWithBalance(a => a.account_number.startsWith('61') || a.account_number.startsWith('62'));
      const personnel = getAccountsWithBalance(a => a.account_number.startsWith('64'));
      const taxes = getAccountsWithBalance(a => a.account_number.startsWith('63'));
      const otherExpenses = getAccountsWithBalance(a => 
        a.account_class === 6 && 
        !a.account_number.startsWith('60') &&
        !a.account_number.startsWith('61') &&
        !a.account_number.startsWith('62') &&
        !a.account_number.startsWith('63') &&
        !a.account_number.startsWith('64')
      );

      const sumBalances = (items: AccountBalance[]) => items.reduce((sum, a) => sum + a.balance, 0);

      const totalIncome = sumBalances(sales) + sumBalances(otherIncome);
      const totalExpenses = sumBalances(purchases) + sumBalances(external) + sumBalances(personnel) + sumBalances(taxes) + sumBalances(otherExpenses);

      return {
        income: {
          sales: { accounts: sales, total: sumBalances(sales) },
          other: { accounts: otherIncome, total: sumBalances(otherIncome) },
          total: totalIncome,
        },
        expenses: {
          purchases: { accounts: purchases, total: sumBalances(purchases) },
          external: { accounts: external, total: sumBalances(external) },
          personnel: { accounts: personnel, total: sumBalances(personnel) },
          taxes: { accounts: taxes, total: sumBalances(taxes) },
          other: { accounts: otherExpenses, total: sumBalances(otherExpenses) },
          total: totalExpenses,
        },
        result: totalIncome - totalExpenses,
      };
    },
    enabled: !!organization?.id,
  });
}

// VAT Report (Déclaration TVA)
export function useVatReport(startDate?: string, endDate?: string) {
  const { organization } = useOrganization();
  const start = startDate || `${new Date().getFullYear()}-01-01`;
  const end = endDate || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['vat-report', organization?.id, start, end],
    queryFn: async (): Promise<VatReportData> => {
      if (!organization?.id) {
        return { collected: { accounts: [], total: 0 }, deductible: { accounts: [], total: 0 }, balance: 0 };
      }

      // Get VAT accounts (44*)
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .like('account_number', '44%');

      if (accountsError) throw accountsError;

      // Get posted entry lines for the period
      const { data: lines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          journal_entry:journal_entries!inner(date, status, organization_id)
        `)
        .eq('journal_entry.organization_id', organization.id)
        .eq('journal_entry.status', 'posted')
        .gte('journal_entry.date', start)
        .lte('journal_entry.date', end);

      if (linesError) throw linesError;

      // Calculate balances
      const balances = new Map<string, number>();
      (lines || []).forEach((line: any) => {
        const current = balances.get(line.account_id) || 0;
        balances.set(line.account_id, current + (line.credit || 0) - (line.debit || 0));
      });

      // TVA collectée (44571*)
      const collectedAccounts: AccountBalance[] = (accounts || [])
        .filter(a => a.account_number.startsWith('44571') || a.account_number === '44571')
        .map(a => ({
          id: a.id,
          account_number: a.account_number,
          name: a.name,
          balance: balances.get(a.id) || 0,
        }))
        .filter(a => Math.abs(a.balance) > 0.01);

      // TVA déductible (44566*)
      const deductibleAccounts: AccountBalance[] = (accounts || [])
        .filter(a => a.account_number.startsWith('44566') || a.account_number === '44566')
        .map(a => ({
          id: a.id,
          account_number: a.account_number,
          name: a.name,
          balance: Math.abs(balances.get(a.id) || 0),
        }))
        .filter(a => a.balance > 0.01);

      const collectedTotal = collectedAccounts.reduce((sum, a) => sum + a.balance, 0);
      const deductibleTotal = deductibleAccounts.reduce((sum, a) => sum + a.balance, 0);

      return {
        collected: { accounts: collectedAccounts, total: collectedTotal },
        deductible: { accounts: deductibleAccounts, total: deductibleTotal },
        balance: collectedTotal - deductibleTotal,
      };
    },
    enabled: !!organization?.id,
  });
}

// Dashboard KPIs
export function useAccountingKPIs() {
  const { organization } = useOrganization();
  const today = new Date().toISOString().split('T')[0];
  const startOfYear = `${new Date().getFullYear()}-01-01`;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  return useQuery({
    queryKey: ['accounting-kpis', organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        return {
          cashBalance: 0,
          vatDue: 0,
          monthlyProfit: 0,
          yearlyProfit: 0,
        };
      }

      // Get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('organization_id', organization.id);

      if (accountsError) throw accountsError;

      // Get all posted entry lines
      const { data: allLines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          journal_entry:journal_entries!inner(date, status, organization_id)
        `)
        .eq('journal_entry.organization_id', organization.id)
        .eq('journal_entry.status', 'posted');

      if (linesError) throw linesError;

      // Cash balance (class 5)
      const cashAccountIds = new Set(
        (accounts || []).filter(a => a.account_class === 5).map(a => a.id)
      );
      const cashBalance = (allLines || [])
        .filter((line: any) => cashAccountIds.has(line.account_id))
        .reduce((sum: number, line: any) => sum + (line.debit || 0) - (line.credit || 0), 0);

      // VAT due (44571 - 44566)
      const vatCollectedIds = new Set(
        (accounts || []).filter(a => a.account_number.startsWith('44571')).map(a => a.id)
      );
      const vatDeductibleIds = new Set(
        (accounts || []).filter(a => a.account_number.startsWith('44566')).map(a => a.id)
      );
      
      const vatCollected = (allLines || [])
        .filter((line: any) => vatCollectedIds.has(line.account_id))
        .reduce((sum: number, line: any) => sum + (line.credit || 0) - (line.debit || 0), 0);
      
      const vatDeductible = (allLines || [])
        .filter((line: any) => vatDeductibleIds.has(line.account_id))
        .reduce((sum: number, line: any) => sum + (line.debit || 0) - (line.credit || 0), 0);

      // Monthly profit (class 7 - class 6)
      const incomeAccountIds = new Set(
        (accounts || []).filter(a => a.account_class === 7).map(a => a.id)
      );
      const expenseAccountIds = new Set(
        (accounts || []).filter(a => a.account_class === 6).map(a => a.id)
      );

      const monthlyIncome = (allLines || [])
        .filter((line: any) => 
          incomeAccountIds.has(line.account_id) && 
          line.journal_entry.date >= startOfMonth
        )
        .reduce((sum: number, line: any) => sum + (line.credit || 0) - (line.debit || 0), 0);

      const monthlyExpenses = (allLines || [])
        .filter((line: any) => 
          expenseAccountIds.has(line.account_id) && 
          line.journal_entry.date >= startOfMonth
        )
        .reduce((sum: number, line: any) => sum + (line.debit || 0) - (line.credit || 0), 0);

      const yearlyIncome = (allLines || [])
        .filter((line: any) => 
          incomeAccountIds.has(line.account_id) && 
          line.journal_entry.date >= startOfYear
        )
        .reduce((sum: number, line: any) => sum + (line.credit || 0) - (line.debit || 0), 0);

      const yearlyExpenses = (allLines || [])
        .filter((line: any) => 
          expenseAccountIds.has(line.account_id) && 
          line.journal_entry.date >= startOfYear
        )
        .reduce((sum: number, line: any) => sum + (line.debit || 0) - (line.credit || 0), 0);

      return {
        cashBalance,
        vatDue: vatCollected - vatDeductible,
        monthlyProfit: monthlyIncome - monthlyExpenses,
        yearlyProfit: yearlyIncome - yearlyExpenses,
      };
    },
    enabled: !!organization?.id,
  });
}

// Helper functions
function getEmptyBalanceSheet(): BalanceSheetData {
  return {
    assets: {
      fixed: { accounts: [], total: 0 },
      current: { accounts: [], total: 0 },
      cash: { accounts: [], total: 0 },
      total: 0,
    },
    liabilities: {
      equity: { accounts: [], total: 0 },
      provisions: { accounts: [], total: 0 },
      debts: { accounts: [], total: 0 },
      total: 0,
    },
  };
}

function getEmptyIncomeStatement(): IncomeStatementData {
  return {
    income: {
      sales: { accounts: [], total: 0 },
      other: { accounts: [], total: 0 },
      total: 0,
    },
    expenses: {
      purchases: { accounts: [], total: 0 },
      external: { accounts: [], total: 0 },
      personnel: { accounts: [], total: 0 },
      taxes: { accounts: [], total: 0 },
      other: { accounts: [], total: 0 },
      total: 0,
    },
    result: 0,
  };
}
