import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useChartOfAccounts, groupAccountsByClass } from '@/hooks/useChartOfAccounts';
import { useGeneralLedger } from '@/hooks/useJournalEntries';

export function GeneralLedgerView() {
  const currentYear = new Date().getFullYear();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const { data: ledgerEntries, isLoading: entriesLoading } = useGeneralLedger({
    accountId: selectedAccountId || undefined,
    startDate,
    endDate,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  // Calculate running balance
  const entriesWithBalance = (ledgerEntries || []).reduce((acc: any[], entry: any, index: number) => {
    const prevBalance = index > 0 ? acc[index - 1].runningBalance : 0;
    const runningBalance = prevBalance + (entry.debit || 0) - (entry.credit || 0);
    return [...acc, { ...entry, runningBalance }];
  }, []);

  // Group accounts by class
  const classNames: Record<number, string> = {
    1: 'Capitaux',
    2: 'Immobilisations',
    3: 'Stocks',
    4: 'Tiers',
    5: 'Financier',
    6: 'Charges',
    7: 'Produits',
  };

  const groupedAccounts = (accounts || []).reduce((acc, account) => {
    const classKey = account.account_class;
    if (!acc[classKey]) {
      acc[classKey] = [];
    }
    acc[classKey].push(account);
    return acc;
  }, {} as Record<number, typeof accounts>);

  const selectedAccount = accounts?.find(a => a.id === selectedAccountId);

  // Calculate totals
  const totals = entriesWithBalance.reduce(
    (acc: { debit: number; credit: number }, entry: any) => ({
      debit: acc.debit + (entry.debit || 0),
      credit: acc.credit + (entry.credit || 0),
    }),
    { debit: 0, credit: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grand livre</CardTitle>
        <CardDescription>
          Historique des mouvements par compte
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label>Compte</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les comptes" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="">Tous les comptes</SelectItem>
                {Object.entries(groupedAccounts).map(([classNum, classAccounts]) => (
                  <div key={classNum}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                      Classe {classNum} - {classNames[Number(classNum)]}
                    </div>
                    {(classAccounts || []).map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <span className="font-mono text-xs mr-2">{account.account_number}</span>
                        {account.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Du</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-2">
            <Label>Au</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        {/* Selected account header */}
        {selectedAccount && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  <span className="font-mono mr-2">{selectedAccount.account_number}</span>
                  {selectedAccount.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Solde: {formatCurrency(totals.debit - totals.credit)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Entries table */}
        {entriesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : entriesWithBalance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucun mouvement sur cette période</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>N° Écriture</TableHead>
                  {!selectedAccountId && <TableHead>Compte</TableHead>}
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Débit</TableHead>
                  <TableHead className="text-right">Crédit</TableHead>
                  {selectedAccountId && <TableHead className="text-right">Solde</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {entriesWithBalance.map((entry: any, index: number) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {format(new Date(entry.journal_entry.date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {entry.journal_entry.entry_number}
                    </TableCell>
                    {!selectedAccountId && (
                      <TableCell>
                        <span className="font-mono text-xs mr-1">{entry.account.account_number}</span>
                        <span className="text-sm text-muted-foreground">{entry.account.name}</span>
                      </TableCell>
                    )}
                    <TableCell className="max-w-xs truncate">
                      {entry.description || entry.journal_entry.description}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </TableCell>
                    {selectedAccountId && (
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(entry.runningBalance)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="flex justify-end gap-8 border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Débit</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(totals.debit)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Crédit</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(totals.credit)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Solde</p>
                <p className="text-lg font-bold tabular-nums">{formatCurrency(totals.debit - totals.credit)}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
