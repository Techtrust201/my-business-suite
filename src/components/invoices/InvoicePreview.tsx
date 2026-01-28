import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import type { Contact } from '@/hooks/useClients';
import type { InvoiceLineInput } from '@/hooks/useInvoices';
import { calculateLineTotal } from '@/hooks/useInvoices';

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

interface InvoicePreviewProps {
  formData: {
    contact_id?: string;
    subject?: string;
    purchase_order_number?: string;
    date: Date;
    due_date?: Date;
    notes?: string;
    terms?: string;
    lines: Array<InvoiceLineInput>;
  };
  organization: Organization | null;
  client: Contact | null;
  totals: {
    subtotal: number;
    globalDiscount?: number;
    taxAmount: number;
    total: number;
  };
  invoiceNumber?: string;
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

export function InvoicePreview({ 
  formData, 
  organization, 
  client, 
  totals,
  invoiceNumber,
  options 
}: InvoicePreviewProps) {
  // Vérifier s'il y a des lignes de type item pour afficher le tableau
  const hasItemLines = formData.lines.some(
    line => !line.line_type || line.line_type === 'item'
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 lg:p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* En-tête entreprise */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {organization?.logo_url && (
              <img 
                src={organization.logo_url} 
                alt={organization.name || 'Logo'} 
                className="h-16 mb-4 object-contain"
              />
            )}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {organization?.name || organization?.legal_name || 'Entreprise'}
            </h2>
            {organization?.legal_name && organization.legal_name !== organization?.name && (
              <p className="text-sm text-gray-600 mb-2">{organization.legal_name}</p>
            )}
            <div className="text-sm text-gray-600 space-y-1">
              {formatAddress(organization) && (
                <p>{formatAddress(organization)}</p>
              )}
              <div className="flex gap-4 mt-2">
                {organization?.phone && (
                  <span>Tél: {organization.phone}</span>
                )}
                {organization?.email && (
                  <span>{organization.email}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Intitulé et Badge FACTURE */}
          <div className="text-right">
            {options?.documentTitle && (
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {options.documentTitle}
              </h1>
            )}
            <div className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">
              FACTURE
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Informations client */}
      {client && (
        <div className="mb-8">
          <div className="bg-gray-50 rounded-lg p-4 border">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Facturer à</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {client.company_name || `${client.first_name || ''} ${client.last_name || ''}`.trim()}
            </h3>
            {formatClientAddress(client) && (
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {formatClientAddress(client)}
              </p>
            )}
            {options?.showSirenSiret && client.siret && (
              <p className="text-sm text-gray-600 mt-2">SIRET: {client.siret}</p>
            )}
            {options?.showVatNumber && client.vat_number && (
              <p className="text-sm text-gray-600 mt-1">N° TVA intracommunautaire: {client.vat_number}</p>
            )}
          </div>
          {options?.showDeliveryAddress && client.shipping_address_line1 && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 border">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Adresse de livraison</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {[
                  client.shipping_address_line1,
                  client.shipping_address_line2,
                  `${client.shipping_postal_code || ''} ${client.shipping_city || ''}`.trim(),
                  client.shipping_country && client.shipping_country !== 'FR' ? client.shipping_country : ''
                ].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Informations de la facture */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          {formData.purchase_order_number && (
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Réf:</span> {formData.purchase_order_number}
            </p>
          )}
          {formData.subject && (
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Objet:</span> {formData.subject}
            </p>
          )}
        </div>
        <div className="text-right text-sm text-gray-600">
          {invoiceNumber && (
            <p className="font-bold text-gray-900 mb-1">Facture N° {invoiceNumber}</p>
          )}
          <p>Date d'émission: {format(formData.date, 'dd MMMM yyyy', { locale: fr })}</p>
          {formData.due_date && (
            <p className="mt-1">Date d'échéance: {format(formData.due_date, 'dd MMMM yyyy', { locale: fr })}</p>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Affichage de toutes les lignes dans l'ordre */}
      {formData.lines.length > 0 ? (
        <div className="mb-8">
          {hasItemLines && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 text-sm font-bold text-gray-700">Désignation</th>
                  <th className="text-right py-3 px-2 text-sm font-bold text-gray-700">Quantité</th>
                  <th className="text-right py-3 px-2 text-sm font-bold text-gray-700">Prix unitaire HT</th>
                  <th className="text-right py-3 px-2 text-sm font-bold text-gray-700">TVA</th>
                  <th className="text-right py-3 px-2 text-sm font-bold text-gray-700">Montant HT</th>
                </tr>
              </thead>
              <tbody>
                {formData.lines.map((line, index) => {
                  const lineType = line.line_type || 'item';
                  
                  // Si c'est une section, l'afficher dans le tableau
                  if (lineType === 'section') {
                    return (
                      <tr key={index}>
                        <td colSpan={5} className="py-4">
                          <h4 className="text-lg font-bold text-gray-900 border-b-2 border-gray-300 pb-2 whitespace-pre-wrap break-all">
                            {line.description || 'Section'}
                          </h4>
                        </td>
                      </tr>
                    );
                  }
                  
                  // Si c'est un texte libre, l'afficher dans le tableau
                  if (lineType === 'text') {
                    return (
                      <tr key={index}>
                        <td colSpan={5} className="py-2">
                          <div className="text-sm text-gray-700 whitespace-pre-wrap break-all">
                            {line.description}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  
                  // Si c'est un article, l'afficher dans le tableau
                  if (lineType === 'item') {
                    const lineTotal = calculateLineTotal(line);
                    return (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-3 px-2 text-sm text-gray-900 whitespace-pre-wrap break-all">
                          {line.description}
                          {((line.discount_percent && line.discount_percent > 0) || (line.discount_amount && line.discount_amount > 0)) && (
                            <span className="text-xs text-gray-500 ml-2">
                              {line.discount_percent && line.discount_percent > 0 
                                ? `(Remise ${line.discount_percent.toFixed(2)}%)`
                                : line.discount_amount && line.discount_amount > 0
                                ? `(Remise ${formatPrice(line.discount_amount)})`
                                : ''}
                            </span>
                          )}
                        </td>
                        <td className="text-right py-3 px-2 text-sm text-gray-700">
                          {line.quantity.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-3 px-2 text-sm text-gray-700 font-mono">
                          {formatPrice(line.unit_price)}
                        </td>
                        <td className="text-right py-3 px-2 text-sm text-gray-700">
                          {line.tax_rate}%
                        </td>
                        <td className="text-right py-3 px-2 text-sm text-gray-900 font-semibold font-mono">
                          {formatPrice(lineTotal)}
                        </td>
                      </tr>
                    );
                  }
                  
                  return null;
                })}
              </tbody>
            </table>
          )}
          
          {/* Si pas de lignes item, afficher seulement textes et sections */}
          {!hasItemLines && (
            <div className="space-y-4">
              {formData.lines.map((line, index) => {
                if (line.line_type === 'section') {
                  return (
                    <div key={index} className="mt-6 mb-4">
                      <h4 className="text-lg font-bold text-gray-900 border-b-2 border-gray-300 pb-2">
                        {line.description || 'Section'}
                      </h4>
                    </div>
                  );
                }
                if (line.line_type === 'text') {
                  return (
                    <div key={index} className="text-sm text-gray-700 whitespace-pre-wrap">
                      {line.description}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8 text-center py-8 text-gray-500">
          <p>Aucune ligne ajoutée</p>
        </div>
      )}

      <Separator className="my-6" />

      {/* Totaux */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm text-gray-700">
            <span>Sous-total HT</span>
            <span className="font-mono">{formatPrice(totals.subtotal)}</span>
          </div>
          {options?.showGlobalDiscount && totals.globalDiscount !== undefined && totals.globalDiscount > 0 && (
            <div className="flex justify-between text-sm text-gray-700">
              <span>Remise globale</span>
              <span className="font-mono text-red-600">- {formatPrice(totals.globalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-700">
            <span>TVA</span>
            <span className="font-mono">{formatPrice(totals.taxAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>Total TTC</span>
            <span className="font-mono">{formatPrice(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Moyen de paiement */}
      {options?.showPaymentMethod && options?.paymentMethodText && (
        <>
          <Separator className="my-6" />
          <div className="mb-8">
            <h4 className="font-semibold text-gray-900 mb-2">Moyen de paiement</h4>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{options.paymentMethodText}</p>
            </div>
          </div>
        </>
      )}

      {/* Notes et conditions */}
      {((options?.showConditions !== false && formData.terms) || formData.notes || options?.showFreeField) && (
        <>
          <Separator className="my-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
            {formData.notes && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                <p className="whitespace-pre-wrap">{formData.notes}</p>
              </div>
            )}
            {options?.showConditions !== false && (options?.conditionsText || formData.terms) && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Conditions de paiement</h4>
                <p className="whitespace-pre-wrap">{options?.conditionsText || formData.terms}</p>
              </div>
            )}
            {options?.showFreeField && options?.freeFieldContent && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Champ libre</h4>
                <p className="whitespace-pre-wrap">{options.freeFieldContent}</p>
              </div>
            )}
          </div>
        </>
      )}
      {options?.showSignature && (
        <>
          <Separator className="my-6" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-4">Signature</p>
            <div className="border-t-2 border-dashed border-gray-300 pt-4">
              <p className="text-gray-500">Signature du client</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
