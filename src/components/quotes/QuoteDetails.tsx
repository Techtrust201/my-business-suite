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
import { Skeleton } from '@/components/ui/skeleton';
import { useQuote, QuoteStatus, calculateTotals } from '@/hooks/useQuotes';
import { useOrganization } from '@/hooks/useOrganization';
import { QuotePreview } from './QuotePreview';
import { Pencil, Eye, Printer, Loader2, Send, TrendingUp } from 'lucide-react';
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
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-base sm:text-lg">Devis {quote?.number}</DialogTitle>
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
                  <Send className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Envoyer</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePreviewPDF}
              >
                <Eye className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Aperçu PDF</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Imprimer</span>
              </Button>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Modifier</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : quote ? (
            <div ref={printRef} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Client & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Client</h3>
                  {quote.contact ? (
                    <div className="space-y-1">
                      <p className="font-medium">
                        {quote.contact.company_name || `${quote.contact.first_name || ''} ${quote.contact.last_name || ''}`}
                      </p>
                      {quote.contact.email && (
                        <p className="text-sm text-muted-foreground break-all">{quote.contact.email}</p>
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
                <div className="sm:text-right space-y-1">
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

              {/* Utiliser QuotePreview pour avoir le même rendu que lors de la création */}
              {(() => {
                if (!quote || !organization) return null;

                // Convertir les données du quote en format formData pour QuotePreview
                const formData = {
                  contact_id: quote.contact_id,
                  subject: quote.subject || '',
                  date: new Date(quote.date),
                  valid_until: quote.valid_until ? new Date(quote.valid_until) : undefined,
                  notes: quote.notes || '',
                  terms: quote.terms || '',
                  lines: (quote.quote_lines || []).map(line => ({
                    description: line.description || '',
                    quantity: Number(line.quantity) || 0,
                    unit_price: Number(line.unit_price) || 0,
                    tax_rate: Number(line.tax_rate) || 0,
                    discount_percent: line.discount_percent ? Number(line.discount_percent) : 0,
                    discount_amount: line.discount_amount ? Number(line.discount_amount) : undefined,
                    purchase_price: line.purchase_price ? Number(line.purchase_price) : null,
                    line_type: (line.line_type as 'item' | 'text' | 'section') || 'item',
                  })),
                };

                // Calculer les totaux avec la même fonction que dans QuoteForm
                const totals = calculateTotals(formData.lines);

                // Déterminer les options d'affichage (par défaut, tout afficher)
                const options = {
                  showDeliveryAddress: !!quote.contact?.shipping_address_line1,
                  showSirenSiret: !!quote.contact?.siret,
                  showVatNumber: !!quote.contact?.vat_number,
                  showSignature: true,
                  showConditions: true,
                  showFreeField: false,
                  showGlobalDiscount: false,
                };

                return (
                  <QuotePreview
                    formData={formData}
                    organization={organization}
                    client={quote.contact || null}
                    totals={totals}
                    quoteNumber={quote.number}
                    options={options}
                  />
                );
              })()}

              {/* Profitability Section - Internal Only */}
              {(() => {
                // Check if any lines have purchase_price (from articles)
                const linesWithCost = quote.quote_lines?.filter(
                  (line: any) => line.purchase_price != null && Number(line.purchase_price) > 0
                ) || [];
                
                if (linesWithCost.length === 0) return null;
                
                const totalCost = linesWithCost.reduce(
                  (sum: number, line: any) => sum + Number(line.purchase_price) * Number(line.quantity),
                  0
                );
                const totalSales = Number(quote.subtotal) || 0;
                const grossMargin = totalSales - totalCost;
                const marginPercent = totalSales > 0 ? (grossMargin / totalSales) * 100 : 0;
                
                return (
                  <>
                    <Separator />
                    <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Rentabilité (usage interne)
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Coût d'achat</p>
                          <p className="font-medium">{formatPrice(totalCost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Marge brute</p>
                          <p className={`font-medium ${grossMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {formatPrice(grossMargin)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Marge %</p>
                          <p className={`font-medium ${marginPercent >= 20 ? 'text-green-600' : marginPercent >= 0 ? 'text-amber-600' : 'text-destructive'}`}>
                            {marginPercent.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Notes & Terms */}
              {(quote.notes || quote.terms) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
        </div>
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
