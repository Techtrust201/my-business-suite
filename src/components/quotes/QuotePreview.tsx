import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Contact } from '@/hooks/useClients';
import type { QuoteLineInput } from '@/hooks/useQuotes';
import { calculateLineTotal } from '@/hooks/useQuotes';

interface Organization {
  id: string;
  name: string | null;
  legal_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
}

interface QuotePreviewProps {
  formData: {
    contact_id?: string;
    subject?: string;
    date: Date;
    valid_until?: Date;
    notes?: string;
    terms?: string;
    lines: Array<QuoteLineInput & { purchase_price?: number | null }>;
  };
  organization: Organization | null;
  client: Contact | null;
  totals: {
    subtotal: number;
    globalDiscount?: number;
    taxAmount: number;
    total: number;
  };
  quoteNumber?: string;
  options?: {
    showDeliveryAddress?: boolean;
    showSirenSiret?: boolean;
    showVatNumber?: boolean;
    showSignature?: boolean;
    showConditions?: boolean;
    showFreeField?: boolean;
    showGlobalDiscount?: boolean;
    documentTitle?: string;
    conditionsText?: string;
    freeFieldContent?: string;
    showPaymentMethod?: boolean;
    paymentMethodText?: string;
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function formatAddress(organization: Organization | null): string {
  if (!organization) return '';
  const parts: string[] = [];
  if (organization.address_line1) parts.push(organization.address_line1);
  if (organization.address_line2) parts.push(organization.address_line2);
  if (organization.postal_code || organization.city) {
    parts.push(`${organization.postal_code || ''} ${organization.city || ''}`.trim());
  }
  if (organization.country && organization.country !== 'FR') {
    parts.push(organization.country);
  }
  return parts.join(', ');
}

function formatClientAddress(client: Contact | null): string {
  if (!client) return '';
  const parts: string[] = [];
  if (client.billing_address_line1) parts.push(client.billing_address_line1);
  if (client.billing_address_line2) parts.push(client.billing_address_line2);
  if (client.billing_postal_code || client.billing_city) {
    parts.push(`${client.billing_postal_code || ''} ${client.billing_city || ''}`.trim());
  }
  if (client.billing_country && client.billing_country !== 'FR') {
    parts.push(client.billing_country);
  }
  return parts.join(', ');
}

export function QuotePreview({
  formData,
  organization,
  client,
  totals,
  quoteNumber,
  options,
}: QuotePreviewProps) {
  const hasItemLines = formData.lines.some(
    (line) => !line.line_type || line.line_type === 'item'
  );

  return (
    <div className="bg-white rounded-lg shadow-md border p-8 lg:p-12 max-w-[700px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={organization.name || 'Logo'}
              className="h-14 mb-4 object-contain"
            />
          ) : (
            <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-white" />
            </div>
          )}
          <div className="mt-3">
            <h2 className="text-lg font-bold text-foreground">
              {organization?.name || organization?.legal_name || 'Entreprise'}
            </h2>
            {organization?.legal_name && organization.legal_name !== organization?.name && (
              <p className="text-xs text-muted-foreground mt-0.5">{organization.legal_name}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {formatAddress(organization)}
              {(organization?.phone || organization?.email) && (
                <>
                  <br />
                  {organization.phone && `Tél : ${organization.phone}`}
                  {organization.phone && organization.email && ' • '}
                  {organization.email}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="text-right">
          {options?.documentTitle && (
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              {options.documentTitle}
            </p>
          )}
          <div className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <FileText className="w-3 h-3" />
            DEVIS
          </div>
        </div>
      </div>

      <Separator className="my-5" />

      {/* Meta info */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Objet
          </p>
          <p className="text-sm font-medium text-foreground">
            {formData.subject || '—'}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground leading-relaxed">
          <div>
            <span className="text-muted-foreground/70">Date d'émission</span>{' '}
            <strong className="text-foreground">
              {format(formData.date, 'dd MMMM yyyy', { locale: fr })}
            </strong>
          </div>
          {formData.valid_until && (
            <div className="mt-1">
              <span className="text-muted-foreground/70">Valide jusqu'au</span>{' '}
              <strong className="text-foreground">
                {format(formData.valid_until, 'dd MMMM yyyy', { locale: fr })}
              </strong>
            </div>
          )}
          {quoteNumber && (
            <div className="mt-1">
              <strong className="text-foreground">Devis N° {quoteNumber}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Client box */}
      {client && (
        <div className="bg-muted/50 rounded-lg p-4 mb-6 flex gap-8">
          <div className="flex-1">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Facturer à
            </p>
            <p className="text-sm font-semibold text-foreground mb-1">
              {client.company_name || `${client.first_name || ''} ${client.last_name || ''}`.trim()}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {formatClientAddress(client)}
              {options?.showSirenSiret && client.siret && (
                <>
                  <br />
                  SIRET: {client.siret}
                </>
              )}
              {options?.showVatNumber && client.vat_number && (
                <>
                  <br />
                  N° TVA: {client.vat_number}
                </>
              )}
            </p>
          </div>
          {options?.showDeliveryAddress && client.shipping_address_line1 && (
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Livraison
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {[
                  client.shipping_address_line1,
                  client.shipping_address_line2,
                  `${client.shipping_postal_code || ''} ${client.shipping_city || ''}`.trim(),
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {formData.lines.length > 0 && hasItemLines && (
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              Article & Description
              </th>
              <th className="text-left py-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Qté
              </th>
              <th className="text-left py-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                P.U. HT
              </th>
              <th className="text-left py-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                TVA
              </th>
              <th className="text-left py-2 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Montant HT
              </th>
            </tr>
          </thead>
          <tbody>
            {formData.lines.map((line, index) => {
              const lineType = line.line_type || 'item';

              if (lineType === 'section') {
                return (
                  <tr key={index}>
                    <td colSpan={5} className="py-2">
                      <div className="bg-primary/10 text-primary font-semibold text-xs px-3 py-1.5 rounded">
                        — {line.description || 'Section'}
                      </div>
                    </td>
                  </tr>
                );
              }

              if (lineType === 'text') {
                return (
                  <tr key={index}>
                    <td colSpan={5} className="py-2">
                      <p className="text-xs text-muted-foreground italic">
                        {line.description}
                      </p>
                    </td>
                  </tr>
                );
              }

              const lineTotal = calculateLineTotal(line);
              const hasDiscount =
                (line.discount_percent && line.discount_percent > 0) ||
                (line.discount_amount && line.discount_amount > 0);

              return (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-2.5 text-xs text-foreground">
                    <span className="font-medium">{line.description || '—'}</span>
                    {hasDiscount && (
                      <span className="text-destructive text-[10px] ml-2">
                        {line.discount_percent && line.discount_percent > 0
                          ? `(Remise ${line.discount_percent}%)`
                          : `(Remise ${formatPrice(line.discount_amount || 0)})`}
                      </span>
                    )}
                  </td>
                  <td className="text-left py-2.5 text-xs text-muted-foreground">
                    {line.quantity.toLocaleString('fr-FR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="text-left py-2.5 text-xs text-muted-foreground font-mono">
                    {formatPrice(line.unit_price)}
                  </td>
                  <td className="text-left py-2.5 text-xs text-muted-foreground">
                    {line.tax_rate}%
                  </td>
                  <td className="text-left py-2.5 text-xs text-foreground font-semibold font-mono">
                    {formatPrice(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Totals */}
      <div className="flex justify-end mb-4">
        <div className="w-56 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground py-1">
            <span>Sous-total HT</span>
            <span className="font-mono font-medium">{formatPrice(totals.subtotal)}</span>
          </div>
          {options?.showGlobalDiscount && totals.globalDiscount && totals.globalDiscount > 0 && (
            <div className="flex justify-between text-xs text-destructive py-1">
              <span>Remise globale</span>
              <span className="font-mono font-medium">− {formatPrice(totals.globalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground py-1">
            <span>TVA</span>
            <span className="font-mono font-medium">{formatPrice(totals.taxAmount)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-foreground py-2 border-t-2 border-foreground mt-2">
            <span>Total TTC</span>
            <span className="font-mono">{formatPrice(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Payment method */}
      {options?.showPaymentMethod && options?.paymentMethodText && (
        <div className="mt-10 mb-6">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 pb-1 border-b">
            Moyen de paiement
          </p>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {options.paymentMethodText}
            </p>
          </div>
        </div>
      )}

      {/* Free field */}
      {options?.showFreeField && options?.freeFieldContent && (
        <div className="mb-6">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 pb-1 border-b">
            Information
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {options.freeFieldContent}
          </p>
        </div>
      )}

      {/* Conditions */}
      {options?.showConditions !== false && (options?.conditionsText || formData.terms) && (
        <div className="mt-10 mb-6">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 pb-1 border-b">
          Conditions de paiement
          </p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {options?.conditionsText || formData.terms}
          </p>
        </div>
      )}

      {/* Signature */}
      {options?.showSignature && (
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 pb-1 border-b">
            Signature
          </p>
          <div className="border-b-2 border-dashed border-border w-60 h-12 mb-1" />
          <p className="text-[10px] text-muted-foreground italic">
            Signature du client — Lu et approuvé, bon pour accord
          </p>
        </div>
      )}
    </div>
  );
}
