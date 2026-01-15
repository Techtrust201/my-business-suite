import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBill, useRecordBillPayment, BillStatus } from '@/hooks/useBills';
import { Pencil, CreditCard, Loader2 } from 'lucide-react';

const STATUS_CONFIG: Record<BillStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  received: { label: 'Reçue', variant: 'default' },
  partially_paid: { label: 'Partiellement payée', variant: 'outline' },
  paid: { label: 'Payée', variant: 'outline' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'secondary' },
};

interface BillDetailsProps {
  billId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export const BillDetails = ({ billId, open, onOpenChange, onEdit }: BillDetailsProps) => {
  const { data: bill, isLoading } = useBill(billId ?? undefined);
  const recordPayment = useRecordBillPayment();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getContactName = () => {
    if (!bill?.contact) return '-';
    if (bill.contact.company_name) return bill.contact.company_name;
    return `${bill.contact.first_name || ''} ${bill.contact.last_name || ''}`.trim() || '-';
  };

  const handleRecordPayment = () => {
    if (billId && paymentAmount) {
      recordPayment.mutate(
        { id: billId, amount: parseFloat(paymentAmount) },
        {
          onSuccess: () => {
            setPaymentAmount('');
            setShowPaymentForm(false);
          },
        }
      );
    }
  };

  const balanceDue = Number(bill?.total || 0) - Number(bill?.amount_paid || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-4 sm:p-6 flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <DialogTitle className="text-base sm:text-lg">
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <>Facture fournisseur {bill?.vendor_reference || bill?.number}</>
              )}
            </DialogTitle>
            {!isLoading && bill && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Modifier</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : bill ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Fournisseur</p>
                <p className="font-medium">{getContactName()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <Badge variant={STATUS_CONFIG[bill.status as BillStatus]?.variant || 'secondary'}>
                  {STATUS_CONFIG[bill.status as BillStatus]?.label || bill.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium text-sm sm:text-base">
                  {format(new Date(bill.date), 'PPP', { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Échéance</p>
                <p className="font-medium text-sm sm:text-base">
                  {bill.due_date
                    ? format(new Date(bill.due_date), 'PPP', { locale: fr })
                    : '-'}
                </p>
              </div>
              {bill.subject && (
                <div className="col-span-1 sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Sujet</p>
                  <p className="font-medium">{bill.subject}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Lines */}
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[400px] sm:min-w-0 px-4 sm:px-0">
                <h3 className="font-medium mb-3">Lignes</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Prix unitaire</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">TVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bill.bill_lines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="max-w-[150px] truncate">{line.description}</TableCell>
                        <TableCell className="text-right">{line.quantity}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          {formatPrice(Number(line.unit_price))}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">{line.tax_rate}%</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatPrice(Number(line.line_total) || Number(line.quantity) * Number(line.unit_price))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sous-total HT</span>
                  <span className="tabular-nums">{formatPrice(Number(bill.subtotal) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>TVA</span>
                  <span className="tabular-nums">{formatPrice(Number(bill.tax_amount) || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total TTC</span>
                  <span className="tabular-nums">{formatPrice(Number(bill.total) || 0)}</span>
                </div>
                {Number(bill.amount_paid) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Payé</span>
                      <span className="tabular-nums">{formatPrice(Number(bill.amount_paid))}</span>
                    </div>
                    <div className="flex justify-between font-medium text-destructive">
                      <span>Reste à payer</span>
                      <span className="tabular-nums">{formatPrice(balanceDue)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Section */}
            {bill.status !== 'paid' && bill.status !== 'cancelled' && (
              <>
                <Separator />
                <div>
                  {!showPaymentForm ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowPaymentForm(true)}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Enregistrer un paiement
                    </Button>
                  ) : (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <h4 className="font-medium">Enregistrer un paiement</h4>
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <Label htmlFor="payment-amount">Montant</Label>
                          <Input
                            id="payment-amount"
                            type="number"
                            step="0.01"
                            placeholder={`Max: ${formatPrice(balanceDue)}`}
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleRecordPayment}
                          disabled={!paymentAmount || recordPayment.isPending}
                        >
                          {recordPayment.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Valider
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowPaymentForm(false);
                            setPaymentAmount('');
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Notes */}
            {bill.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{bill.notes}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Achat non trouvé</p>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
