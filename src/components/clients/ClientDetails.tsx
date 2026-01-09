import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Contact } from '@/hooks/useClients';
import { Building2, Mail, Phone, MapPin, FileText, Pencil, User } from 'lucide-react';

interface ClientDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onEdit: (contact: Contact) => void;
}

function getContactDisplayName(contact: Contact): string {
  if (contact.company_name) {
    return contact.company_name;
  }
  const parts = [contact.first_name, contact.last_name].filter(Boolean);
  return parts.join(' ') || 'Sans nom';
}

function getContactTypeLabel(type: string): string {
  switch (type) {
    case 'client':
      return 'Client';
    case 'supplier':
      return 'Fournisseur';
    case 'both':
      return 'Client & Fournisseur';
    default:
      return type;
  }
}

function formatAddress(
  line1?: string | null,
  line2?: string | null,
  postalCode?: string | null,
  city?: string | null,
  country?: string | null
): string | null {
  const parts = [line1, line2, [postalCode, city].filter(Boolean).join(' '), country].filter(
    Boolean
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

export function ClientDetails({ open, onOpenChange, contact, onEdit }: ClientDetailsProps) {
  if (!contact) return null;

  const billingAddress = formatAddress(
    contact.billing_address_line1,
    contact.billing_address_line2,
    contact.billing_postal_code,
    contact.billing_city,
    contact.billing_country
  );

  const shippingAddress = formatAddress(
    contact.shipping_address_line1,
    contact.shipping_address_line2,
    contact.shipping_postal_code,
    contact.shipping_city,
    contact.shipping_country
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                {contact.company_name ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle>{getContactDisplayName(contact)}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{getContactTypeLabel(contact.type)}</Badge>
                  {!contact.is_active && (
                    <Badge variant="secondary">Inactif</Badge>
                  )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {contact.company_name && (contact.first_name || contact.last_name) && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
              </span>
            </div>
          )}

          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                {contact.email}
              </a>
            </div>
          )}

          {(contact.phone || contact.mobile) && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>
                {[contact.phone, contact.mobile].filter(Boolean).join(' / ')}
              </span>
            </div>
          )}

          {(contact.siret || contact.vat_number) && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>
                {contact.siret && `SIRET: ${contact.siret}`}
                {contact.siret && contact.vat_number && ' • '}
                {contact.vat_number && `TVA: ${contact.vat_number}`}
              </span>
            </div>
          )}

          {billingAddress && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Adresse de facturation</h4>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>{billingAddress}</span>
                </div>
              </div>
            </>
          )}

          {shippingAddress && shippingAddress !== billingAddress && (
            <div>
              <h4 className="text-sm font-medium mb-2">Adresse de livraison</h4>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>{shippingAddress}</span>
              </div>
            </div>
          )}

          {contact.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </div>
            </>
          )}

          {contact.payment_terms && (
            <div className="text-sm text-muted-foreground">
              Délai de paiement : {contact.payment_terms} jours
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={() => onEdit(contact)}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
