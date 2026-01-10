import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Link,
  CheckCircle2,
  Receipt,
  FileText,
  Wallet,
} from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { useBills } from '@/hooks/useBills';
import { useBankTransactions, type BankTransaction } from '@/hooks/useBankTransactions';

interface ReconciliationPanelProps {
  transaction: BankTransaction;
  onClose: () => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Algorithme de matching simple basé sur le montant et la date
function calculateMatchScore(
  transactionAmount: number,
  transactionDate: string,
  documentAmount: number,
  documentDate: string | null
): number {
  let score = 0;

  // Score sur le montant (exact = 50 points, proche = 10-40 points)
  const amountDiff = Math.abs(transactionAmount - documentAmount);
  const amountPercent = amountDiff / transactionAmount;

  if (amountDiff < 0.01) {
    score += 50; // Montant exact
  } else if (amountPercent < 0.01) {
    score += 40; // Différence < 1%
  } else if (amountPercent < 0.05) {
    score += 20; // Différence < 5%
  } else if (amountPercent < 0.1) {
    score += 10; // Différence < 10%
  }

  // Score sur la date (proche = bonus)
  if (documentDate) {
    const txDate = new Date(transactionDate);
    const docDate = new Date(documentDate);
    const daysDiff = Math.abs(
      (txDate.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 1) {
      score += 30; // Même jour ou jour suivant
    } else if (daysDiff <= 7) {
      score += 20; // Dans la semaine
    } else if (daysDiff <= 30) {
      score += 10; // Dans le mois
    }
  }

  return score;
}

export function ReconciliationPanel({
  transaction,
  onClose,
}: ReconciliationPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'bills'>('invoices');

  const { invoices } = useInvoices();
  const { bills } = useBills();
  const { reconcileTransaction } = useBankTransactions();

  // Filtrer et scorer les factures
  const scoredInvoices = useMemo(() => {
    const unpaidInvoices = invoices.filter(
      (inv) =>
        inv.status !== 'paid' &&
        inv.status !== 'cancelled' &&
        (inv.total || 0) - (inv.amount_paid || 0) > 0
    );

    return unpaidInvoices
      .map((inv) => {
        const remainingAmount = (inv.total || 0) - (inv.amount_paid || 0);
        const score = calculateMatchScore(
          transaction.amount,
          transaction.date,
          remainingAmount,
          inv.due_date
        );
        return { ...inv, remainingAmount, score };
      })
      .filter(
        (inv) =>
          !searchTerm ||
          inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.contact?.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          inv.contact?.first_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.score - a.score);
  }, [invoices, transaction, searchTerm]);

  // Filtrer et scorer les factures fournisseurs
  const scoredBills = useMemo(() => {
    const unpaidBills = bills.filter(
      (bill) =>
        bill.status !== 'paid' &&
        bill.status !== 'cancelled' &&
        (bill.total || 0) - (bill.amount_paid || 0) > 0
    );

    return unpaidBills
      .map((bill) => {
        const remainingAmount = (bill.total || 0) - (bill.amount_paid || 0);
        const score = calculateMatchScore(
          transaction.amount,
          transaction.date,
          remainingAmount,
          bill.due_date
        );
        return { ...bill, remainingAmount, score };
      })
      .filter(
        (bill) =>
          !searchTerm ||
          bill.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.contact?.company_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.score - a.score);
  }, [bills, transaction, searchTerm]);

  const handleReconcileInvoice = async (invoiceId: string) => {
    await reconcileTransaction.mutateAsync({
      transactionId: transaction.id,
      invoiceId,
    });
    onClose();
  };

  const handleReconcileBill = async (billId: string) => {
    await reconcileTransaction.mutateAsync({
      transactionId: transaction.id,
      billId,
    });
    onClose();
  };

  const handleMarkAsReconciled = async () => {
    await reconcileTransaction.mutateAsync({
      transactionId: transaction.id,
    });
    onClose();
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Rapprocher la transaction</SheetTitle>
          <SheetDescription>
            Associez cette transaction à une facture ou une dépense
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Transaction info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {transaction.type === 'credit' ? (
                  <ArrowDownCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowUpCircle className="h-4 w-4 text-red-500" />
                )}
                Transaction à rapprocher
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="font-medium">{transaction.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatDate(transaction.date)}
                  </span>
                  <span
                    className={
                      transaction.type === 'credit'
                        ? 'text-green-600 font-medium'
                        : 'text-red-600 font-medium'
                    }
                  >
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatPrice(transaction.amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'invoices' | 'bills')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invoices" className="gap-2">
                <Receipt className="h-4 w-4" />
                Factures ({scoredInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="bills" className="gap-2">
                <FileText className="h-4 w-4" />
                Achats ({scoredBills.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoices" className="mt-4">
              <ScrollArea className="h-[300px]">
                {scoredInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune facture correspondante
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scoredInvoices.map((invoice) => (
                      <Card
                        key={invoice.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleReconcileInvoice(invoice.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {invoice.number}
                                </span>
                                {invoice.score >= 50 && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-500"
                                  >
                                    Suggestion
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {invoice.contact?.company_name ||
                                  `${invoice.contact?.first_name || ''} ${invoice.contact?.last_name || ''}`.trim() ||
                                  'Client inconnu'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatPrice(invoice.remainingAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {invoice.due_date
                                  ? `Échéance: ${formatDate(invoice.due_date)}`
                                  : 'Sans échéance'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="bills" className="mt-4">
              <ScrollArea className="h-[300px]">
                {scoredBills.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune facture fournisseur correspondante
                  </div>
                ) : (
                  <div className="space-y-2">
                    {scoredBills.map((bill) => (
                      <Card
                        key={bill.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleReconcileBill(bill.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {bill.number || 'Sans numéro'}
                                </span>
                                {bill.score >= 50 && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-500"
                                  >
                                    Suggestion
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {bill.contact?.company_name || 'Fournisseur inconnu'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">
                                {formatPrice(bill.remainingAmount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {bill.due_date
                                  ? `Échéance: ${formatDate(bill.due_date)}`
                                  : 'Sans échéance'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter className="flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleMarkAsReconciled}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marquer comme rapproché (sans lien)
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Annuler
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

