import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoicesTable } from '@/components/invoices/InvoicesTable';
import { useInvoices } from '@/hooks/useInvoices';
import { Receipt, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const Factures = () => {
  const { data: allInvoices } = useInvoices();
  const { data: paidInvoices } = useInvoices({ status: 'paid' });
  const { data: overdueInvoices } = useInvoices({ status: 'overdue' });
  const { data: pendingInvoices } = useInvoices({ status: 'sent' });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const totalPending = pendingInvoices?.reduce((sum, inv) => 
    sum + (Number(inv.total) - Number(inv.amount_paid || 0)), 0) || 0;
  
  const totalOverdue = overdueInvoices?.reduce((sum, inv) => 
    sum + (Number(inv.total) - Number(inv.amount_paid || 0)), 0) || 0;

  const totalPaid = paidInvoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Factures</h1>
          <p className="text-muted-foreground">
            Gérez votre facturation et suivez vos paiements
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total factures</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allInvoices?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalPending)}</div>
              <p className="text-xs text-muted-foreground">
                {pendingInvoices?.length || 0} facture(s)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En retard</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatPrice(totalOverdue)}</div>
              <p className="text-xs text-muted-foreground">
                {overdueInvoices?.length || 0} facture(s)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payées (ce mois)</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPrice(totalPaid)}</div>
              <p className="text-xs text-muted-foreground">
                {paidInvoices?.length || 0} facture(s)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <InvoicesTable />
      </div>
    </AppLayout>
  );
};

export default Factures;
