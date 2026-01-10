import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Receipt, AlertTriangle, CheckCircle } from 'lucide-react';
import { useVatReport } from '@/hooks/useAccountingReports';
import { cn } from '@/lib/utils';

interface VatReportViewProps {
  startDate: string;
  endDate: string;
}

export function VatReportView({ startDate, endDate }: VatReportViewProps) {
  const { data: vatReport, isLoading } = useVatReport(startDate, endDate);

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

  const balance = vatReport?.balance || 0;
  const isDue = balance > 0;
  const isCredit = balance < 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className={cn(
        isDue && "border-orange-200 dark:border-orange-800",
        isCredit && "border-green-200 dark:border-green-800"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDue ? (
                <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              ) : isCredit ? (
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                  <Receipt className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">
                  {isDue ? 'TVA à décaisser' : isCredit ? 'Crédit de TVA' : 'Solde TVA'}
                </p>
                <p className={cn(
                  "text-3xl font-bold tabular-nums",
                  isDue && "text-orange-600 dark:text-orange-400",
                  isCredit && "text-green-600 dark:text-green-400"
                )}>
                  {formatCurrency(Math.abs(balance))}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={isDue ? "destructive" : isCredit ? "default" : "secondary"}>
                {isDue ? 'À payer' : isCredit ? 'À reporter' : 'Équilibré'}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* TVA Collectée */}
        <Card>
          <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
            <CardTitle className="text-blue-700 dark:text-blue-300">TVA Collectée</CardTitle>
            <CardDescription>TVA facturée à vos clients</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {vatReport?.collected.accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune TVA collectée</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vatReport?.collected.accounts.map(account => (
                  <div key={account.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{account.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{account.account_number}</p>
                    </div>
                    <span className="font-bold tabular-nums">{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-4 border-t">
                  <span className="font-semibold">Total TVA collectée</span>
                  <span className="font-bold tabular-nums text-blue-700 dark:text-blue-300">
                    {formatCurrency(vatReport?.collected.total || 0)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* TVA Déductible */}
        <Card>
          <CardHeader className="bg-green-50 dark:bg-green-900/20">
            <CardTitle className="text-green-700 dark:text-green-300">TVA Déductible</CardTitle>
            <CardDescription>TVA payée à vos fournisseurs</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {vatReport?.deductible.accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Aucune TVA déductible</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vatReport?.deductible.accounts.map(account => (
                  <div key={account.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{account.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{account.account_number}</p>
                    </div>
                    <span className="font-bold tabular-nums">{formatCurrency(account.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-4 border-t">
                  <span className="font-semibold">Total TVA déductible</span>
                  <span className="font-bold tabular-nums text-green-700 dark:text-green-300">
                    {formatCurrency(vatReport?.deductible.total || 0)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calculation details */}
      <Card>
        <CardHeader>
          <CardTitle>Calcul de la TVA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-lg">
              <span>TVA collectée</span>
              <span className="font-medium tabular-nums">{formatCurrency(vatReport?.collected.total || 0)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>TVA déductible</span>
              <span className="font-medium tabular-nums">- {formatCurrency(vatReport?.deductible.total || 0)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-3 border-t-2">
              <span>{isDue ? 'TVA à décaisser' : isCredit ? 'Crédit de TVA' : 'Solde'}</span>
              <span className={cn(
                "tabular-nums",
                isDue && "text-orange-600 dark:text-orange-400",
                isCredit && "text-green-600 dark:text-green-400"
              )}>
                {formatCurrency(Math.abs(balance))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
