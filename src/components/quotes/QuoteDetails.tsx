import { useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { Pencil, Download, Printer, Loader2 } from 'lucide-react';

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Devis ${quote?.number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company { font-size: 14px; }
            .company h1 { font-size: 24px; margin-bottom: 8px; }
            .quote-info { text-align: right; }
            .quote-info h2 { font-size: 28px; color: #666; margin-bottom: 8px; }
            .client { margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .client h3 { margin-bottom: 8px; font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .text-right { text-align: right; }
            .totals { display: flex; justify-content: flex-end; }
            .totals-box { width: 250px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .total-row.final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; margin-top: 8px; padding-top: 16px; }
            .terms { margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">
              <h1>${organization?.name || ''}</h1>
              <p>${organization?.address_line1 || ''}</p>
              <p>${organization?.postal_code || ''} ${organization?.city || ''}</p>
              <p>${organization?.email || ''}</p>
              <p>${organization?.phone || ''}</p>
              ${organization?.siret ? `<p>SIRET: ${organization.siret}</p>` : ''}
            </div>
            <div class="quote-info">
              <h2>DEVIS</h2>
              <p><strong>${quote?.number}</strong></p>
              <p>Date: ${quote ? format(new Date(quote.date), 'dd/MM/yyyy') : ''}</p>
              ${quote?.valid_until ? `<p>Valide jusqu'au: ${format(new Date(quote.valid_until), 'dd/MM/yyyy')}</p>` : ''}
            </div>
          </div>
          
          ${quote?.contact ? `
            <div class="client">
              <h3>Client</h3>
              <p><strong>${quote.contact.company_name || `${quote.contact.first_name || ''} ${quote.contact.last_name || ''}`}</strong></p>
              ${quote.contact.billing_address_line1 ? `<p>${quote.contact.billing_address_line1}</p>` : ''}
              ${quote.contact.billing_postal_code || quote.contact.billing_city ? `<p>${quote.contact.billing_postal_code || ''} ${quote.contact.billing_city || ''}</p>` : ''}
              ${quote.contact.email ? `<p>${quote.contact.email}</p>` : ''}
            </div>
          ` : ''}

          ${quote?.subject ? `<p style="margin-bottom: 20px;"><strong>Objet:</strong> ${quote.subject}</p>` : ''}

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Qté</th>
                <th class="text-right">Prix HT</th>
                <th class="text-right">TVA</th>
                <th class="text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              ${quote?.quote_lines?.map(line => `
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

          <div class="totals">
            <div class="totals-box">
              <div class="total-row">
                <span>Sous-total HT</span>
                <span>${formatPrice(Number(quote?.subtotal || 0))}</span>
              </div>
              <div class="total-row">
                <span>TVA</span>
                <span>${formatPrice(Number(quote?.tax_amount || 0))}</span>
              </div>
              <div class="total-row final">
                <span>Total TTC</span>
                <span>${formatPrice(Number(quote?.total || 0))}</span>
              </div>
            </div>
          </div>

          ${quote?.terms ? `
            <div class="terms">
              <h3 style="margin-bottom: 8px;">Conditions</h3>
              <p>${quote.terms}</p>
            </div>
          ` : ''}

          ${organization?.legal_mentions ? `
            <div class="terms" style="margin-top: 20px;">
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
            <DialogTitle>Devis {quote?.number}</DialogTitle>
            {quote && (
              <Badge variant={STATUS_CONFIG[quote.status as QuoteStatus]?.variant || 'secondary'}>
                {STATUS_CONFIG[quote.status as QuoteStatus]?.label || quote.status}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer / PDF
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
                    <div>
                      <p className="font-medium">
                        {quote.contact.company_name || `${quote.contact.first_name || ''} ${quote.contact.last_name || ''}`}
                      </p>
                      {quote.contact.email && (
                        <p className="text-sm text-muted-foreground">{quote.contact.email}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Aucun client</p>
                  )}
                </div>
                <div className="text-right">
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
                </div>
              </div>

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
                          <td className="text-right p-3">{line.tax_rate}%</td>
                          <td className="text-right p-3 font-medium">{formatPrice(Number(line.line_total))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

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
    </Dialog>
  );
};
