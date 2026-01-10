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
import { useQuote, QuoteStatus } from '@/hooks/useQuotes';
import { useOrganization } from '@/hooks/useOrganization';
import { Pencil, Eye, Printer, Loader2, Send } from 'lucide-react';
import { generateQuotePDF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import { SendEmailModal } from '@/components/email/SendEmailModal';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyé', variant: 'default' },
  accepted: { label: 'Accepté', variant: 'outline' },
  rejected: { label: 'Refusé', variant: 'destructive' },
  expired: { label: 'Expiré', variant: 'secondary' },
};

interface QuoteDetailsProps {
  quoteId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export const QuoteDetails = ({ quoteId, open, onOpenChange, onEdit }: QuoteDetailsProps) => {
  const { data: quote, isLoading } = useQuote(quoteId ?? undefined);
  const { organization } = useOrganization();
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<jsPDF | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const generatePdf = useCallback(async (): Promise<jsPDF> => {
    if (!quote || !organization) throw new Error('Missing data');
    return await generateQuotePDF(quote as any, organization as any);
  }, [quote, organization]);

  const handlePreviewPDF = async () => {
    if (!quote || !organization) return;
    
    setShowPdfPreview(true);
    setIsGeneratingPDF(true);
    setPdfDoc(null);
    
    try {
      const doc = await generateQuotePDF(quote as any, organization as any);
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

  const handlePrint = async () => {
    if (!quote || !organization) return;
    
    try {
      const doc = await generateQuotePDF(quote as any, organization as any);
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    } catch (error) {
      console.error('Error generating PDF for print:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <DialogTitle>Devis {quote?.number}</DialogTitle>
            {quote && (
              <Badge variant={STATUS_CONFIG[quote.status as QuoteStatus]?.variant || 'secondary'}>
                {STATUS_CONFIG[quote.status as QuoteStatus]?.label || quote.status}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {quote?.contact?.email && (
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

        <ScrollArea className="h-[calc(95vh-100px)]">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : quote ? (
            <div ref={printRef} className="p-6 space-y-6">
              {/* Client & Dates */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Client</h3>
                  {quote.contact ? (
                    <div className="space-y-1">
                      <p className="font-medium">
                        {quote.contact.company_name || `${quote.contact.first_name || ''} ${quote.contact.last_name || ''}`}
                      </p>
                      {quote.contact.email && (
                        <p className="text-sm text-muted-foreground">{quote.contact.email}</p>
                      )}
                      {(quote.contact.phone || quote.contact.mobile) && (
                        <p className="text-sm text-muted-foreground">
                          {quote.contact.phone || quote.contact.mobile}
                        </p>
                      )}
                      {(quote.contact.billing_address_line1 || quote.contact.billing_city) && (
                        <div className="text-sm text-muted-foreground">
                          {quote.contact.billing_address_line1 && <p>{quote.contact.billing_address_line1}</p>}
                          {quote.contact.billing_address_line2 && <p>{quote.contact.billing_address_line2}</p>}
                          {(quote.contact.billing_postal_code || quote.contact.billing_city) && (
                            <p>{quote.contact.billing_postal_code} {quote.contact.billing_city}</p>
                          )}
                          {quote.contact.billing_country && <p>{quote.contact.billing_country}</p>}
                        </div>
                      )}
                      {quote.contact.siret && (
                        <p className="text-sm text-muted-foreground">SIRET: {quote.contact.siret}</p>
                      )}
                      {quote.contact.vat_number && (
                        <p className="text-sm text-muted-foreground">TVA: {quote.contact.vat_number}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Aucun client</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Date: </span>
                    {format(new Date(quote.date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  {quote.valid_until && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Valide jusqu'au: </span>
                      {format(new Date(quote.valid_until), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                  {quote.created_at && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Créé le: </span>
                      {format(new Date(quote.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                  )}
                  {quote.updated_at && quote.updated_at !== quote.created_at && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Modifié le: </span>
                      {format(new Date(quote.updated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>

              {/* Converted to invoice badge */}
              {quote.converted_to_invoice_id && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✓ Converti en facture
                  </span>
                </div>
              )}

              {quote.subject && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Objet</h3>
                  <p>{quote.subject}</p>
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
                        {quote.quote_lines?.some(l => l.discount_percent && Number(l.discount_percent) > 0) && (
                          <th className="text-right p-3 font-medium w-20">Remise</th>
                        )}
                        <th className="text-right p-3 font-medium w-20">TVA</th>
                        <th className="text-right p-3 font-medium w-28">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.quote_lines?.map((line, index) => (
                        <tr key={line.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="p-3">{line.description}</td>
                          <td className="text-right p-3">{line.quantity}</td>
                          <td className="text-right p-3">{formatPrice(Number(line.unit_price))}</td>
                          {quote.quote_lines?.some(l => l.discount_percent && Number(l.discount_percent) > 0) && (
                            <td className="text-right p-3">
                              {line.discount_percent && Number(line.discount_percent) > 0 
                                ? `${line.discount_percent}%` 
                                : '-'}
                            </td>
                          )}
                          <td className="text-right p-3">{line.tax_rate}%</td>
                          <td className="text-right p-3 font-medium">{formatPrice(Number(line.line_total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VAT Summary */}
              {quote.quote_lines && quote.quote_lines.length > 0 && (
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
                        {Object.entries(
                          quote.quote_lines.reduce((acc, line) => {
                            const rate = Number(line.tax_rate) || 0;
                            if (!acc[rate]) acc[rate] = { base: 0, vat: 0 };
                            acc[rate].base += Number(line.line_total) || 0;
                            acc[rate].vat += (Number(line.line_total) || 0) * (rate / 100);
                            return acc;
                          }, {} as Record<number, { base: number; vat: number }>)
                        ).map(([rate, values], index) => (
                          <tr key={rate} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <td className="p-2">TVA {rate}%</td>
                            <td className="text-right p-2">{formatPrice(values.base)}</td>
                            <td className="text-right p-2">{formatPrice(values.vat)}</td>
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
                    <span className="text-muted-foreground">Sous-total HT</span>
                    <span>{formatPrice(Number(quote.subtotal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TVA</span>
                    <span>{formatPrice(Number(quote.tax_amount))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total TTC</span>
                    <span>{formatPrice(Number(quote.total))}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              {(quote.notes || quote.terms) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-6">
                    {quote.notes && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                        <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                      </div>
                    )}
                    {quote.terms && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Conditions</h3>
                        <p className="text-sm whitespace-pre-wrap">{quote.terms}</p>
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
        fileName={`Devis-${quote?.number || 'N-A'}.pdf`}
        title={`Aperçu Devis ${quote?.number || ''}`}
        isGenerating={isGeneratingPDF}
      />

      {quote && (
        <SendEmailModal
          open={showEmailModal}
          onOpenChange={setShowEmailModal}
          documentId={quote.id}
          documentNumber={quote.number}
          documentType="quote"
          recipientEmail={quote.contact?.email || ''}
          organizationName={organization?.name || ''}
          pdfGenerator={generatePdf}
        />
      )}
    </Dialog>
  );
};
