import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useBalanceSheet } from '@/hooks/useAccountingReports';

interface BalanceSheetReportProps {
  date: string;
}

export function BalanceSheetReport({ date }: BalanceSheetReportProps) {
  const { data: balanceSheet, isLoading } = useBalanceSheet(date);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEmpty = 
    balanceSheet?.assets.total === 0 && 
    balanceSheet?.liabilities.total === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bilan</CardTitle>
          <CardDescription>Au {new Date(date).toLocaleDateString('fr-FR')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Aucune donnée comptable disponible</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les données apparaîtront une fois les premières écritures enregistrées
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* ACTIF */}
      <Card>
        <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
          <CardTitle className="text-blue-700 dark:text-blue-300">ACTIF</CardTitle>
          <CardDescription>Ce que l'entreprise possède</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Immobilisations */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Actif immobilisé
            </h3>
            {balanceSheet?.assets.fixed.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucun</p>
            ) : (
              <div className="space-y-2">
                {balanceSheet?.assets.fixed.accounts.map(account => (
                  <div key={account.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{account.name}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total actif immobilisé</span>
                  <span className="tabular-nums">{formatCurrency(balanceSheet?.assets.fixed.total || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actif circulant */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Actif circulant
            </h3>
            {balanceSheet?.assets.current.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucun</p>
            ) : (
              <div className="space-y-2">
                {balanceSheet?.assets.current.accounts.map(account => (
                  <div key={account.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{account.name}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total actif circulant</span>
                  <span className="tabular-nums">{formatCurrency(balanceSheet?.assets.current.total || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Trésorerie */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Trésorerie
            </h3>
            {balanceSheet?.assets.cash.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucun</p>
            ) : (
              <div className="space-y-2">
                {balanceSheet?.assets.cash.accounts.map(account => (
                  <div key={account.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{account.name}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total trésorerie</span>
                  <span className="tabular-nums">{formatCurrency(balanceSheet?.assets.cash.total || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Total Actif */}
          <div className="pt-4 border-t-2 border-blue-200 dark:border-blue-800">
            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL ACTIF</span>
              <span className="tabular-nums text-blue-700 dark:text-blue-300">
                {formatCurrency(balanceSheet?.assets.total || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PASSIF */}
      <Card>
        <CardHeader className="bg-orange-50 dark:bg-orange-900/20">
          <CardTitle className="text-orange-700 dark:text-orange-300">PASSIF</CardTitle>
          <CardDescription>Ce que l'entreprise doit</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Capitaux propres */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Capitaux propres
            </h3>
            {balanceSheet?.liabilities.equity.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucun</p>
            ) : (
              <div className="space-y-2">
                {balanceSheet?.liabilities.equity.accounts.map(account => (
                  <div key={account.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{account.name}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(Math.abs(account.balance))}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total capitaux propres</span>
                  <span className="tabular-nums">{formatCurrency(balanceSheet?.liabilities.equity.total || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Dettes */}
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Dettes
            </h3>
            {balanceSheet?.liabilities.debts.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucune</p>
            ) : (
              <div className="space-y-2">
                {balanceSheet?.liabilities.debts.accounts.map(account => (
                  <div key={account.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{account.name}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(Math.abs(account.balance))}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total dettes</span>
                  <span className="tabular-nums">{formatCurrency(balanceSheet?.liabilities.debts.total || 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Total Passif */}
          <div className="pt-4 border-t-2 border-orange-200 dark:border-orange-800">
            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL PASSIF</span>
              <span className="tabular-nums text-orange-700 dark:text-orange-300">
                {formatCurrency(balanceSheet?.liabilities.total || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
