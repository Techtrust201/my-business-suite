import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';
import type { ProspectWithStatus, ProspectContact } from '@/hooks/useProspects';

interface ConvertToClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: ProspectWithStatus;
  contacts: ProspectContact[];
  onSuccess?: () => void;
}

export function ConvertToClientModal({
  open,
  onOpenChange,
  prospect,
  contacts,
  onSuccess,
}: ConvertToClientModalProps) {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [isConverting, setIsConverting] = useState(false);
  const [createContacts, setCreateContacts] = useState(true);

  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];

  const handleConvert = async () => {
    if (!organization?.id) return;

    setIsConverting(true);

    try {
      // 1. Create the client in contacts table
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          organization_id: organization.id,
          type: 'client',
          company_name: prospect.company_name,
          first_name: primaryContact?.first_name || null,
          last_name: primaryContact?.last_name || null,
          email: primaryContact?.email || prospect.email || null,
          phone: primaryContact?.phone || prospect.phone || null,
          mobile: primaryContact?.mobile || null,
          siret: prospect.siret,
          siren: prospect.siren,
          vat_number: prospect.vat_number,
          legal_form: prospect.legal_form,
          naf_code: prospect.naf_code,
          billing_address_line1: prospect.address_line1,
          billing_address_line2: prospect.address_line2,
          billing_city: prospect.city,
          billing_postal_code: prospect.postal_code,
          billing_country: prospect.country || 'FR',
          notes: prospect.notes,
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // 2. Update prospect with contact_id and converted_at
      const { error: updateError } = await supabase
        .from('prospects')
        .update({
          contact_id: newContact.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', prospect.id);

      if (updateError) throw updateError;

      // 3. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospect', prospect.id] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });

      toast.success('Prospect converti en client avec succès !');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error converting prospect:', error);
      toast.error('Erreur lors de la conversion');
    } finally {
      setIsConverting(false);
    }
  };

  const isAlreadyConverted = !!prospect.converted_at || !!prospect.contact_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convertir en client
          </DialogTitle>
          <DialogDescription>
            {prospect.company_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isAlreadyConverted ? (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Ce prospect a déjà été converti en client.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Cette action va créer une fiche client dans le module Facturation avec les informations du prospect.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 pt-2">
                <div className="text-sm space-y-2">
                  <p className="font-medium">Données qui seront transférées :</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Raison sociale : {prospect.company_name}</li>
                    {prospect.siret && <li>SIRET : {prospect.siret}</li>}
                    {prospect.address_line1 && <li>Adresse : {prospect.address_line1}</li>}
                    {(primaryContact?.email || prospect.email) && (
                      <li>Email : {primaryContact?.email || prospect.email}</li>
                    )}
                    {(primaryContact?.phone || prospect.phone) && (
                      <li>Téléphone : {primaryContact?.phone || prospect.phone}</li>
                    )}
                  </ul>
                </div>

                {contacts.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="createContacts"
                      checked={createContacts}
                      onCheckedChange={(checked) => setCreateContacts(checked as boolean)}
                    />
                    <Label htmlFor="createContacts" className="text-sm">
                      Inclure les informations du contact principal
                    </Label>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          {!isAlreadyConverted && (
            <Button onClick={handleConvert} disabled={isConverting}>
              {isConverting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Convertir en client
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
