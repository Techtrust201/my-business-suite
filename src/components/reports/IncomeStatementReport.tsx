import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useIncomeStatement } from '@/hooks/useAccountingReports';
import { cn } from '@/lib/utils';

interface IncomeStatementReportProps {
  startDate: string;
  endDate: string;
}

export function IncomeStatementReport({ startDate, endDate }: IncomeStatementReportProps) {
  const { data: incomeStatement, isLoading } = useIncomeStatement(startDate, endDate);

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
    incomeStatement?.income.total === 0 && 
    incomeStatement?.expenses.total === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compte de résultat</CardTitle>
          <CardDescription>
            Du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
          </CardDescription>
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

  const result = incomeStatement?.result || 0;
  const isProfit = result > 0;
  const isLoss = result < 0;

  return (
    <div className="space-y-6">
      {/* Result Summary */}
      <Card className={cn(
        isProfit && "border-green-200 dark:border-green-800",
        isLoss && "border-red-200 dark:border-red-800"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isProfit ? (
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              ) : isLoss ? (
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                  <Minus className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Résultat de la période</p>
                <p className={cn(
                  "text-3xl font-bold tabular-nums",
                  isProfit && "text-green-600 dark:text-green-400",
                  isLoss && "text-red-600 dark:text-red-400"
                )}>
                  {formatCurrency(result)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {isProfit ? 'Bénéfice' : isLoss ? 'Perte' : 'Résultat nul'}
              </p>
              <p className="text-sm text-muted-foreground">
                Du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PRODUITS */}
        <Card>
          <CardHeader className="bg-green-50 dark:bg-green-900/20">
            <CardTitle className="text-green-700 dark:text-green-300">PRODUITS</CardTitle>
            <CardDescription>Revenus de l'activité</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Ventes */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Chiffre d'affaires
              </h3>
              {incomeStatement?.income.sales.accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucun</p>
              ) : (
                <div className="space-y-2">
                  {incomeStatement?.income.sales.accounts.map(account => (
                    <div key={account.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{account.name}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(account.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total CA</span>
                    <span className="tabular-nums">{formatCurrency(incomeStatement?.income.sales.total || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Autres produits */}
            {incomeStatement?.income.other.accounts.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Autres produits
                </h3>
                <div className="space-y-2">
                  {incomeStatement?.income.other.accounts.map(account => (
                    <div key={account.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{account.name}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(account.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total autres produits</span>
                    <span className="tabular-nums">{formatCurrency(incomeStatement?.income.other.total || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Total Produits */}
            <div className="pt-4 border-t-2 border-green-200 dark:border-green-800">
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL PRODUITS</span>
                <span className="tabular-nums text-green-700 dark:text-green-300">
                  {formatCurrency(incomeStatement?.income.total || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CHARGES */}
        <Card>
          <CardHeader className="bg-red-50 dark:bg-red-900/20">
            <CardTitle className="text-red-700 dark:text-red-300">CHARGES</CardTitle>
            <CardDescription>Dépenses de l'activité</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Achats */}
            {incomeStatement?.expenses.purchases.accounts.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Achats
                </h3>
                <div className="space-y-2">
                  {incomeStatement?.expenses.purchases.accounts.map(account => (
                    <div key={account.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{account.name}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(account.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total achats</span>
                    <span className="tabular-nums">{formatCurrency(incomeStatement?.expenses.purchases.total || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Services externes */}
            {incomeStatement?.expenses.external.accounts.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Services extérieurs
                </h3>
                <div className="space-y-2">
                  {incomeStatement?.expenses.external.accounts.map(account => (
                    <div key={account.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{account.name}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(account.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total services ext.</span>
                    <span className="tabular-nums">{formatCurrency(incomeStatement?.expenses.external.total || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Personnel */}
            {incomeStatement?.expenses.personnel.accounts.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                  Charges de personnel
                </h3>
                <div className="space-y-2">
                  {incomeStatement?.expenses.personnel.accounts.map(account => (
                    <div key={account.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{account.name}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(account.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total personnel</span>
                    <span className="tabular-nums">{formatCurrency(incomeStatement?.expenses.personnel.total || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {incomeStatement?.expenses.total === 0 && (
              <p className="text-sm text-muted-foreground italic">Aucune charge</p>
            )}

            {/* Total Charges */}
            <div className="pt-4 border-t-2 border-red-200 dark:border-red-800">
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL CHARGES</span>
                <span className="tabular-nums text-red-700 dark:text-red-300">
                  {formatCurrency(incomeStatement?.expenses.total || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
