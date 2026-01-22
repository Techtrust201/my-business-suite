import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useClientProfitability, useGlobalProfitability } from '@/hooks/useClientProfitability';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Users, Receipt, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

export function ClientProfitability() {
  const { data: clients, isLoading, error } = useClientProfitability();
  const totals = useGlobalProfitability();
  const { canViewMargins } = useCurrentUserPermissions();

  if (!canViewMargins) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
            <Lock className="h-12 w-12" />
            <div>
              <p className="font-medium">Accès restreint</p>
              <p className="text-sm">Vous n'avez pas la permission de voir les données de rentabilité.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-destructive">Erreur lors du chargement des données</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {totals.isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatPrice(totals.total_revenue)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marge Brute</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {totals.isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className={cn(
                "text-2xl font-bold",
                totals.gross_margin >= 0 ? "text-green-600" : "text-destructive"
              )}>
                {formatPrice(totals.gross_margin)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Marge</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {totals.isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className={cn(
                "text-2xl font-bold",
                totals.margin_percent >= 20 ? "text-green-600" : 
                totals.margin_percent >= 10 ? "text-amber-600" : "text-destructive"
              )}>
                {totals.margin_percent.toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients Facturés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {totals.isLoading ? (
              <Skeleton className="h-7 w-8" />
            ) : (
              <div className="text-2xl font-bold">{totals.client_count}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Rentabilité par client
          </CardTitle>
          <CardDescription>
            Analyse des marges sur les factures payées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Coût</TableHead>
                  <TableHead className="text-right">Marge</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Taux</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Factures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : !clients?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Aucune facture payée trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.client_id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {client.client_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(client.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                        {formatPrice(client.total_cost)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-medium",
                          client.gross_margin >= 0 ? "text-green-600" : "text-destructive"
                        )}>
                          {client.gross_margin >= 0 ? (
                            <TrendingUp className="inline h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="inline h-3 w-3 mr-1" />
                          )}
                          {formatPrice(client.gross_margin)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        <Badge variant={
                          client.margin_percent >= 20 ? 'default' :
                          client.margin_percent >= 10 ? 'secondary' : 'destructive'
                        }>
                          {client.margin_percent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell text-muted-foreground">
                        {client.invoice_count}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
