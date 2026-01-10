import { useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInvoice, useRecordPayment, InvoiceStatus, calculateVatSummary } from '@/hooks/useInvoices';
import { useOrganization } from '@/hooks/useOrganization';
import { Pencil, Printer, Loader2, CreditCard, Eye, Send } from 'lucide-react';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import { SendEmailModal } from '@/components/email/SendEmailModal';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyée', variant: 'default' },
  viewed: { label: 'Vue', variant: 'default' },
  paid: { label: 'Payée', variant: 'outline' },
  partially_paid: { label: 'Partielle', variant: 'default' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'secondary' },
};

interface InvoiceDetailsProps {
  invoiceId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export const InvoiceDetails = ({ invoiceId, open, onOpenChange, onEdit }: InvoiceDetailsProps) => {
  const { data: invoice, isLoading } = useInvoice(invoiceId ?? undefined);
  const { organization } = useOrganization();
  const recordPayment = useRecordPayment();
  const printRef = useRef<HTMLDivElement>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<jsPDF | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const generatePdf = useCallback(async (): Promise<jsPDF> => {
    if (!invoice || !organization) throw new Error('Missing data');
    return await generateInvoicePDF(invoice as any, organization as any);
  }, [invoice, organization]);

  const handlePreviewPDF = async () => {
    if (!invoice || !organization) return;
    
    setShowPdfPreview(true);
    setIsGeneratingPDF(true);
    setPdfDoc(null);
    
    try {
      const doc = await generateInvoicePDF(invoice as any, organization as any);
      setPdfDoc(doc);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
      setShowPdfPreview(false);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const balanceDue = invoice ? Number(invoice.total || 0) - Number(invoice.amount_paid || 0) : 0;
  const vatSummary = invoice?.invoice_lines ? calculateVatSummary(invoice.invoice_lines) : [];

  const handleRecordPayment = () => {
    if (invoice && paymentAmount) {
      recordPayment.mutate(
        { id: invoice.id, amount: Number(paymentAmount) },
        {
          onSuccess: () => {
            setPaymentAmount('');
            setShowPaymentInput(false);
          },
        }
      );
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent || !invoice) return;

    const vatSummaryHtml = vatSummary.map(v => `
      <tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">TVA ${v.rate}%</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${formatPrice(v.base)}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${formatPrice(v.vat)}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facture ${invoice?.number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #333; font-size: 12px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company { font-size: 12px; }
            .company h1 { font-size: 20px; margin-bottom: 8px; color: #111; }
            .company p { margin: 2px 0; color: #555; }
            .invoice-info { text-align: right; }
            .invoice-info h2 { font-size: 24px; color: #111; margin-bottom: 8px; }
            .invoice-info p { margin: 2px 0; }
            .client { margin-bottom: 30px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6; }
            .client h3 { margin-bottom: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
            .client p { margin: 2px 0; }
            .po-number { margin-bottom: 20px; padding: 12px; background: #fef3c7; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #374151; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .text-right { text-align: right; }
            .vat-summary { margin-bottom: 24px; }
            .vat-summary h4 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
            .vat-table { width: 300px; margin-left: auto; }
            .vat-table th, .vat-table td { padding: 8px; border: 1px solid #e5e7eb; font-size: 11px; }
            .totals { display: flex; justify-content: flex-end; margin-bottom: 30px; }
            .totals-box { width: 280px; background: #f9fafb; padding: 16px; border-radius: 8px; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
            .total-row.final { font-size: 16px; font-weight: bold; border-top: 2px solid #111; margin-top: 8px; padding-top: 12px; }
            .total-row.balance { color: #dc2626; font-weight: 600; }
            .bank-info { margin-top: 30px; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; }
            .bank-info h4 { font-size: 11px; text-transform: uppercase; color: #166534; margin-bottom: 8px; }
            .bank-info p { margin: 4px 0; font-size: 11px; }
            .terms { margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; font-size: 11px; }
            .legal { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; text-align: center; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">
              <h1>${organization?.name || ''}</h1>
              ${organization?.legal_name ? `<p><strong>${organization.legal_name}</strong></p>` : ''}
              <p>${organization?.address_line1 || ''}</p>
              ${organization?.address_line2 ? `<p>${organization.address_line2}</p>` : ''}
              <p>${organization?.postal_code || ''} ${organization?.city || ''}</p>
              <p>${organization?.country || ''}</p>
              <br/>
              ${organization?.phone ? `<p>Tél: ${organization.phone}</p>` : ''}
              ${organization?.email ? `<p>Email: ${organization.email}</p>` : ''}
              <br/>
              ${organization?.siret ? `<p>SIRET: ${organization.siret}</p>` : ''}
              ${organization?.vat_number ? `<p>N° TVA: ${organization.vat_number}</p>` : ''}
            </div>
            <div class="invoice-info">
              <h2>FACTURE</h2>
              <p><strong>${invoice?.number}</strong></p>
              <p>Date: ${invoice ? format(new Date(invoice.date), 'dd/MM/yyyy') : ''}</p>
              ${invoice?.due_date ? `<p>Échéance: ${format(new Date(invoice.due_date), 'dd/MM/yyyy')}</p>` : ''}
            </div>
          </div>
          
          ${invoice?.contact ? `
            <div class="client">
              <h3>Facturer à</h3>
              <p><strong>${invoice.contact.company_name || `${invoice.contact.first_name || ''} ${invoice.contact.last_name || ''}`}</strong></p>
              ${invoice.contact.billing_address_line1 ? `<p>${invoice.contact.billing_address_line1}</p>` : ''}
              ${invoice.contact.billing_address_line2 ? `<p>${invoice.contact.billing_address_line2}</p>` : ''}
              ${invoice.contact.billing_postal_code || invoice.contact.billing_city ? `<p>${invoice.contact.billing_postal_code || ''} ${invoice.contact.billing_city || ''}</p>` : ''}
              ${invoice.contact.billing_country ? `<p>${invoice.contact.billing_country}</p>` : ''}
              ${invoice.contact.email ? `<p>Email: ${invoice.contact.email}</p>` : ''}
              ${invoice.contact.vat_number ? `<p>N° TVA: ${invoice.contact.vat_number}</p>` : ''}
            </div>
          ` : ''}

          ${invoice?.purchase_order_number ? `
            <div class="po-number">
              <strong>Référence commande client:</strong> ${invoice.purchase_order_number}
            </div>
          ` : ''}

          ${invoice?.subject ? `<p style="margin-bottom: 20px;"><strong>Objet:</strong> ${invoice.subject}</p>` : ''}

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right" style="width: 60px;">Qté</th>
                <th class="text-right" style="width: 100px;">Prix unit. HT</th>
                <th class="text-right" style="width: 60px;">TVA</th>
                <th class="text-right" style="width: 100px;">Total HT</th>
              </tr>
            </thead>
            <tbody>
              ${invoice?.invoice_lines?.map(line => `
                <tr>
                  <td>${line.description}</td>
                  <td class="text-right">${line.quantity}</td>
                  <td class="text-right">${formatPrice(Number(line.unit_price))}</td>
                  <td class="text-right">${line.tax_rate}%</td>
                  <td class="text-right">${formatPrice(Number(line.line_total))}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>

          ${vatSummary.length > 0 ? `
            <div class="vat-summary">
              <h4>Récapitulatif TVA</h4>
              <table class="vat-table">
                <thead>
                  <tr>
                    <th>Taux</th>
                    <th class="text-right">Base HT</th>
                    <th class="text-right">Montant TVA</th>
                  </tr>
                </thead>
                <tbody>
                  ${vatSummaryHtml}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="totals">
            <div class="totals-box">
              <div class="total-row">
                <span>Total HT</span>
                <span>${formatPrice(Number(invoice?.subtotal || 0))}</span>
              </div>
              <div class="total-row">
                <span>Total TVA</span>
                <span>${formatPrice(Number(invoice?.tax_amount || 0))}</span>
              </div>
              <div class="total-row final">
                <span>Total TTC</span>
                <span>${formatPrice(Number(invoice?.total || 0))}</span>
              </div>
              ${Number(invoice?.amount_paid || 0) > 0 ? `
                <div class="total-row" style="margin-top: 8px;">
                  <span>Acompte reçu</span>
                  <span>-${formatPrice(Number(invoice?.amount_paid || 0))}</span>
                </div>
                <div class="total-row balance">
                  <span>Solde à payer</span>
                  <span>${formatPrice(balanceDue)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          ${organization?.bank_details || organization?.rib || organization?.bic ? `
            <div class="bank-info">
              <h4>Informations bancaires</h4>
              ${organization.bank_details ? `<p>${organization.bank_details}</p>` : ''}
              ${organization.rib ? `<p><strong>RIB:</strong> ${organization.rib}</p>` : ''}
              ${organization.bic ? `<p><strong>BIC:</strong> ${organization.bic}</p>` : ''}
            </div>
          ` : ''}

          ${invoice?.terms ? `
            <div class="terms">
              <h4 style="margin-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #374151;">Conditions de paiement</h4>
              <p>${invoice.terms}</p>
            </div>
          ` : ''}

          ${organization?.legal_mentions ? `
            <div class="legal">
              <p>${organization.legal_mentions}</p>
            </div>
          ` : ''}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <DialogTitle>Facture {invoice?.number}</DialogTitle>
            {invoice && (
              <Badge variant={STATUS_CONFIG[invoice.status as InvoiceStatus]?.variant || 'secondary'}>
                {STATUS_CONFIG[invoice.status as InvoiceStatus]?.label || invoice.status}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {invoice && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPaymentInput(!showPaymentInput)}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Paiement
              </Button>
            )}
            {invoice?.contact?.email && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setShowEmailModal(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePreviewPDF}
            >
              <Eye className="mr-2 h-4 w-4" />
              Aperçu PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            )}
          </div>
        </DialogHeader>

        {showPaymentInput && invoice && (
          <div className="mx-6 p-4 bg-muted/50 rounded-lg flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="payment-amount">Montant du paiement</Label>
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
              {recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
            <Button variant="ghost" onClick={() => setShowPaymentInput(false)}>
              Annuler
            </Button>
          </div>
        )}

        <ScrollArea className="h-[calc(95vh-100px)]">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : invoice ? (
            <div ref={printRef} className="p-6 space-y-6">
              {/* Client & Dates */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Client</h3>
                  {invoice.contact ? (
                    <div>
                      <p className="font-medium">
                        {invoice.contact.company_name || `${invoice.contact.first_name || ''} ${invoice.contact.last_name || ''}`}
                      </p>
                      {invoice.contact.email && (
                        <p className="text-sm text-muted-foreground">{invoice.contact.email}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Aucun client</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Date: </span>
                    {format(new Date(invoice.date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  {invoice.due_date && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Échéance: </span>
                      {format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>

              {invoice.purchase_order_number && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <span className="text-sm font-medium">Référence commande: </span>
                  <span className="text-sm">{invoice.purchase_order_number}</span>
                </div>
              )}

              {invoice.subject && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Objet</h3>
                  <p>{invoice.subject}</p>
                </div>
              )}

              <Separator />

              {/* Lines */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Détail</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Description</th>
                        <th className="text-right p-3 font-medium w-20">Qté</th>
                        <th className="text-right p-3 font-medium w-28">Prix HT</th>
                        <th className="text-right p-3 font-medium w-20">TVA</th>
                        <th className="text-right p-3 font-medium w-28">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.invoice_lines?.map((line, index) => (
                        <tr key={line.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="p-3">{line.description}</td>
                          <td className="text-right p-3">{line.quantity}</td>
                          <td className="text-right p-3">{formatPrice(Number(line.unit_price))}</td>
                          <td className="text-right p-3">{line.tax_rate}%</td>
                          <td className="text-right p-3 font-medium">{formatPrice(Number(line.line_total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VAT Summary */}
              {vatSummary.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Récapitulatif TVA</h3>
                  <div className="border rounded-lg overflow-hidden w-fit ml-auto">
                    <table className="text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium w-24">Taux</th>
                          <th className="text-right p-2 font-medium w-28">Base HT</th>
                          <th className="text-right p-2 font-medium w-28">TVA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vatSummary.map((v, index) => (
                          <tr key={v.rate} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <td className="p-2">TVA {v.rate}%</td>
                            <td className="text-right p-2">{formatPrice(v.base)}</td>
                            <td className="text-right p-2">{formatPrice(v.vat)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total HT</span>
                    <span>{formatPrice(Number(invoice.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total TVA</span>
                    <span>{formatPrice(Number(invoice.tax_amount))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total TTC</span>
                    <span>{formatPrice(Number(invoice.total))}</span>
                  </div>
                  {Number(invoice.amount_paid || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Acompte reçu</span>
                        <span className="text-green-600">-{formatPrice(Number(invoice.amount_paid))}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-lg text-destructive">
                        <span>Solde à payer</span>
                        <span>{formatPrice(balanceDue)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bank Info */}
              {(organization?.bank_details || organization?.rib || organization?.bic) && (
                <>
                  <Separator />
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      Informations bancaires
                    </h3>
                    <div className="text-sm space-y-1">
                      {organization.bank_details && <p>{organization.bank_details}</p>}
                      {organization.rib && <p><strong>RIB:</strong> {organization.rib}</p>}
                      {organization.bic && <p><strong>BIC:</strong> {organization.bic}</p>}
                    </div>
                  </div>
                </>
              )}

              {/* Notes & Terms */}
              {(invoice.notes || invoice.terms) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-6">
                    {invoice.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                        <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                      </div>
                    )}
                    {invoice.terms && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Conditions</h3>
                        <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>

      <PdfPreviewModal
        open={showPdfPreview}
        onOpenChange={setShowPdfPreview}
        pdfDoc={pdfDoc}
        fileName={`Facture-${invoice?.number || 'N-A'}.pdf`}
        title={`Aperçu Facture ${invoice?.number || ''}`}
        isGenerating={isGeneratingPDF}
      />

      {invoice && (
        <SendEmailModal
          open={showEmailModal}
          onOpenChange={setShowEmailModal}
          documentId={invoice.id}
          documentNumber={invoice.number}
          documentType="invoice"
          recipientEmail={invoice.contact?.email || ''}
          organizationName={organization?.name || ''}
          pdfGenerator={generatePdf}
        />
      )}
    </Dialog>
  );
};
