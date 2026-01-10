import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  CheckCircle2,
  Receipt,
  FileText,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useInvoices } from '@/hooks/useInvoices';
import { useBills } from '@/hooks/useBills';
import { useBankTransactions, type BankTransaction } from '@/hooks/useBankTransactions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const { data: invoices = [] } = useInvoices();
  const { data: bills = [] } = useBills();
  const { reconcileTransaction } = useBankTransactions();

  // Récupérer les factures déjà liées à une transaction bancaire
  const { data: linkedInvoiceIds = [] } = useQuery({
    queryKey: ['linked-invoice-ids'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bank_transactions')
        .select('matched_invoice_id')
        .not('matched_invoice_id', 'is', null);
      return data?.map((t) => t.matched_invoice_id).filter(Boolean) as string[] || [];
    },
  });

  // Récupérer les factures fournisseurs déjà liées
  const { data: linkedBillIds = [] } = useQuery({
    queryKey: ['linked-bill-ids'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bank_transactions')
        .select('matched_bill_id')
        .not('matched_bill_id', 'is', null);
      return data?.map((t) => t.matched_bill_id).filter(Boolean) as string[] || [];
    },
  });

  // Filtrer et scorer les factures (inclut les "Payées" sans lien bancaire)
  const scoredInvoices = useMemo(() => {
    const eligibleInvoices = invoices.filter((inv) => {
      // Exclure les annulées
      if (inv.status === 'cancelled') return false;
      // Exclure les factures déjà liées à une transaction bancaire
      if (linkedInvoiceIds.includes(inv.id)) return false;
      // Inclure si non payée avec un solde > 0
      const remainingDue = (inv.total || 0) - (inv.amount_paid || 0);
      if (inv.status !== 'paid' && remainingDue > 0) return true;
      // Inclure les factures "Payées" sans lien bancaire (pour permettre le rapprochement)
      if (inv.status === 'paid' && !linkedInvoiceIds.includes(inv.id)) return true;
      return false;
    });

    return eligibleInvoices
      .map((inv) => {
        // Pour les factures payées sans lien, utiliser le total comme montant à rapprocher
        const isPaidWithoutLink = inv.status === 'paid';
        const remainingAmount = isPaidWithoutLink 
          ? Number(inv.total || 0) 
          : (inv.total || 0) - (inv.amount_paid || 0);
        const score = calculateMatchScore(
          transaction.amount,
          transaction.date,
          remainingAmount,
          inv.due_date
        );
        return { ...inv, remainingAmount, score, isPaidWithoutLink };
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
  }, [invoices, transaction, searchTerm, linkedInvoiceIds]);

  // Filtrer et scorer les factures fournisseurs (inclut les "Payées" sans lien bancaire)
  const scoredBills = useMemo(() => {
    const eligibleBills = bills.filter((bill) => {
      // Exclure les annulées
      if (bill.status === 'cancelled') return false;
      // Exclure les factures déjà liées à une transaction bancaire
      if (linkedBillIds.includes(bill.id)) return false;
      // Inclure si non payée avec un solde > 0
      const remainingDue = (bill.total || 0) - (bill.amount_paid || 0);
      if (bill.status !== 'paid' && remainingDue > 0) return true;
      // Inclure les factures "Payées" sans lien bancaire
      if (bill.status === 'paid' && !linkedBillIds.includes(bill.id)) return true;
      return false;
    });

    return eligibleBills
      .map((bill) => {
        const isPaidWithoutLink = bill.status === 'paid';
        const remainingAmount = isPaidWithoutLink
          ? Number(bill.total || 0)
          : (bill.total || 0) - (bill.amount_paid || 0);
        const score = calculateMatchScore(
          transaction.amount,
          transaction.date,
          remainingAmount,
          bill.due_date
        );
        return { ...bill, remainingAmount, score, isPaidWithoutLink };
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
  }, [bills, transaction, searchTerm, linkedBillIds]);

  const handleReconcileInvoice = async (invoice: typeof scoredInvoices[0]) => {
    // Vérifier que les montants correspondent (tolérance 1 centime)
    if (Math.abs(transaction.amount - invoice.remainingAmount) > 0.01) {
      toast.error(
        `Les montants ne correspondent pas : Transaction ${formatPrice(transaction.amount)} vs Facture ${formatPrice(invoice.remainingAmount)}. Seuls les montants identiques peuvent être rapprochés.`
      );
      return;
    }

    await reconcileTransaction.mutateAsync({
      transactionId: transaction.id,
      invoiceId: invoice.id,
      paymentAmount: transaction.amount,
    });
    onClose();
  };

  const handleReconcileBill = async (bill: typeof scoredBills[0]) => {
    // Vérifier que les montants correspondent (tolérance 1 centime)
    if (Math.abs(transaction.amount - bill.remainingAmount) > 0.01) {
      toast.error(
        `Les montants ne correspondent pas : Transaction ${formatPrice(transaction.amount)} vs Facture ${formatPrice(bill.remainingAmount)}. Seuls les montants identiques peuvent être rapprochés.`
      );
      return;
    }

    await reconcileTransaction.mutateAsync({
      transactionId: transaction.id,
      billId: bill.id,
      paymentAmount: transaction.amount,
    });
    onClose();
  };

  const handleMarkAsReconciled = async () => {
    await reconcileTransaction.mutateAsync({
      transactionId: transaction.id,
    });
    onClose();
  };

  // Vérifie si les montants correspondent
  const amountsMatch = (docAmount: number) => Math.abs(transaction.amount - docAmount) <= 0.01;

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
                    {scoredInvoices.map((invoice) => {
                      const isMatch = amountsMatch(invoice.remainingAmount);
                      return (
                        <Card
                          key={invoice.id}
                          className={`transition-colors ${
                            isMatch
                              ? 'cursor-pointer hover:bg-muted/50 border-green-200'
                              : 'opacity-60 cursor-not-allowed border-red-200'
                          }`}
                          onClick={() => isMatch && handleReconcileInvoice(invoice)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">
                                    {invoice.number}
                                  </span>
                                  {invoice.isPaidWithoutLink && (
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Payée sans lien
                                    </Badge>
                                  )}
                                  {isMatch ? (
                                    <Badge variant="default" className="bg-green-500">
                                      Montant exact
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Montant différent
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
                                <p className={`font-medium ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
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
                      );
                    })}
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
                    {scoredBills.map((bill) => {
                      const isMatch = amountsMatch(bill.remainingAmount);
                      return (
                        <Card
                          key={bill.id}
                          className={`transition-colors ${
                            isMatch
                              ? 'cursor-pointer hover:bg-muted/50 border-green-200'
                              : 'opacity-60 cursor-not-allowed border-red-200'
                          }`}
                          onClick={() => isMatch && handleReconcileBill(bill)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">
                                    {bill.number || 'Sans numéro'}
                                  </span>
                                  {bill.isPaidWithoutLink && (
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Payée sans lien
                                    </Badge>
                                  )}
                                  {isMatch ? (
                                    <Badge variant="default" className="bg-green-500">
                                      Montant exact
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Montant différent
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {bill.contact?.company_name || 'Fournisseur inconnu'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`font-medium ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
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
                      );
                    })}
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

