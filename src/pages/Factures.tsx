import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoicesTable } from '@/components/invoices/InvoicesTable';
import { useInvoices } from '@/hooks/useInvoices';
import { Receipt, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const Factures = () => {
  const { data: allInvoices } = useInvoices();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  // Calculate stats from all invoices
  const stats = useMemo(() => {
    if (!allInvoices) {
      return {
        totalCount: 0,
        pendingCount: 0,
        pendingAmount: 0,
        overdueCount: 0,
        overdueAmount: 0,
        paidCount: 0,
        paidAmount: 0,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let pendingCount = 0;
    let pendingAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let paidCount = 0;
    let paidAmount = 0;

    for (const inv of allInvoices) {
      const total = Number(inv.total) || 0;
      const amountPaid = Number(inv.amount_paid) || 0;
      const remainingDue = total - amountPaid;

      if (inv.status === 'paid') {
        paidCount++;
        paidAmount += total;
      } else if (inv.status === 'cancelled') {
        // Don't count cancelled invoices
      } else {
        // Check if overdue (has due date and it's past)
        const dueDate = inv.due_date ? new Date(inv.due_date) : null;
        const isOverdue = dueDate && dueDate < today && remainingDue > 0;

        if (isOverdue || inv.status === 'overdue') {
          overdueCount++;
          overdueAmount += remainingDue;
        } else if (remainingDue > 0) {
          // Pending: draft, sent, partially_paid, viewed - anything not paid and not overdue
          pendingCount++;
          pendingAmount += remainingDue;
        }
      }
    }

    return {
      totalCount: allInvoices.length,
      pendingCount,
      pendingAmount,
      overdueCount,
      overdueAmount,
      paidCount,
      paidAmount,
    };
  }, [allInvoices]);

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
              <div className="text-2xl font-bold">{stats.totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">À encaisser</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.pendingAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingCount} facture(s)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En retard</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatPrice(stats.overdueAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overdueCount} facture(s)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payées</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatPrice(stats.paidAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.paidCount} facture(s)
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
