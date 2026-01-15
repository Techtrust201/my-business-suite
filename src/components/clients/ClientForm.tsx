import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Contact, useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { useEffect, useState } from 'react';
import { CompanySearch } from './CompanySearch';
import { CompanySearchResult } from '@/hooks/useCompanySearch';
import { calculateFrenchVAT, extractSirenFromSiret } from '@/lib/vatCalculator';
import { CheckCircle2, Copy } from 'lucide-react';

const contactSchema = z.object({
  type: z.enum(['client', 'supplier', 'both']),
  company_name: z.string().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  email: z.string().email('Email invalide').optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  siren: z.string().regex(/^$|^\d{9}$/, 'Le SIREN doit contenir 9 chiffres').optional().or(z.literal('')).nullable(),
  siret: z.string().regex(/^$|^\d{14}$/, 'Le SIRET doit contenir 14 chiffres').optional().or(z.literal('')).nullable(),
  vat_number: z.string().optional().nullable(),
  legal_form: z.string().optional().nullable(),
  naf_code: z.string().optional().nullable(),
  billing_address_line1: z.string().optional().nullable(),
  billing_address_line2: z.string().optional().nullable(),
  billing_city: z.string().optional().nullable(),
  billing_postal_code: z.string().optional().nullable(),
  billing_country: z.string().optional().nullable(),
  shipping_address_line1: z.string().optional().nullable(),
  shipping_address_line2: z.string().optional().nullable(),
  shipping_city: z.string().optional().nullable(),
  shipping_postal_code: z.string().optional().nullable(),
  shipping_country: z.string().optional().nullable(),
  payment_terms: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => data.company_name || data.first_name || data.last_name,
  {
    message: 'Veuillez renseigner un nom de société ou un nom de contact',
    path: ['company_name'],
  }
);

type ContactFormData = z.infer<typeof contactSchema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
}

export function ClientForm({ open, onOpenChange, contact }: ClientFormProps) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isEditing = !!contact;
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      type: 'client',
      company_name: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      siren: '',
      siret: '',
      vat_number: '',
      legal_form: '',
      naf_code: '',
      billing_address_line1: '',
      billing_address_line2: '',
      billing_city: '',
      billing_postal_code: '',
      billing_country: 'FR',
      shipping_address_line1: '',
      shipping_address_line2: '',
      shipping_city: '',
      shipping_postal_code: '',
      shipping_country: 'FR',
      payment_terms: 30,
      notes: '',
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        type: contact.type,
        company_name: contact.company_name || '',
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        siren: (contact as any).siren || '',
        siret: contact.siret || '',
        vat_number: contact.vat_number || '',
        legal_form: (contact as any).legal_form || '',
        naf_code: (contact as any).naf_code || '',
        billing_address_line1: contact.billing_address_line1 || '',
        billing_address_line2: contact.billing_address_line2 || '',
        billing_city: contact.billing_city || '',
        billing_postal_code: contact.billing_postal_code || '',
        billing_country: contact.billing_country || 'FR',
        shipping_address_line1: contact.shipping_address_line1 || '',
        shipping_address_line2: contact.shipping_address_line2 || '',
        shipping_city: contact.shipping_city || '',
        shipping_postal_code: contact.shipping_postal_code || '',
        shipping_country: contact.shipping_country || 'FR',
        payment_terms: contact.payment_terms || 30,
        notes: contact.notes || '',
      });
      setIsAutoFilled(false);
    } else {
      form.reset({
        type: 'client',
        company_name: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        mobile: '',
        siren: '',
        siret: '',
        vat_number: '',
        legal_form: '',
        naf_code: '',
        billing_address_line1: '',
        billing_address_line2: '',
        billing_city: '',
        billing_postal_code: '',
        billing_country: 'FR',
        shipping_address_line1: '',
        shipping_address_line2: '',
        shipping_city: '',
        shipping_postal_code: '',
        shipping_country: 'FR',
        payment_terms: 30,
        notes: '',
      });
      setIsAutoFilled(false);
    }
  }, [contact, form]);

  const handleCompanySelect = (company: CompanySearchResult) => {
    // Set company name
    form.setValue('company_name', company.nom_raison_sociale || company.nom_complet);
    
    // Set SIREN and SIRET
    form.setValue('siren', company.siren);
    form.setValue('siret', company.siret);
    
    // Calculate and set VAT number
    const vatNumber = calculateFrenchVAT(company.siren);
    form.setValue('vat_number', vatNumber);
    
    // Set legal form and NAF code
    form.setValue('legal_form', company.libelle_nature_juridique || '');
    form.setValue('naf_code', company.activite_principale || '');
    
    // Set address
    form.setValue('billing_address_line1', company.siege.adresse || '');
    form.setValue('billing_address_line2', company.siege.complement_adresse || '');
    form.setValue('billing_postal_code', company.siege.code_postal || '');
    form.setValue('billing_city', company.siege.libelle_commune || '');
    form.setValue('billing_country', 'FR');
    
    setIsAutoFilled(true);
  };

  const copyBillingToShipping = () => {
    form.setValue('shipping_address_line1', form.getValues('billing_address_line1'));
    form.setValue('shipping_address_line2', form.getValues('billing_address_line2'));
    form.setValue('shipping_postal_code', form.getValues('billing_postal_code'));
    form.setValue('shipping_city', form.getValues('billing_city'));
    form.setValue('shipping_country', form.getValues('billing_country'));
  };

  const onSubmit = async (data: ContactFormData) => {
    try {
      if (isEditing && contact) {
        await updateClient.mutateAsync({ id: contact.id, ...data });
      } else {
        await createClient.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isLoading = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? 'Modifier le contact' : 'Nouveau contact'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations du contact'
              : 'Ajoutez un nouveau client ou fournisseur'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-3">
                <TabsTrigger value="general" className="flex-shrink-0 min-w-[80px] sm:min-w-0">Général</TabsTrigger>
                <TabsTrigger value="address" className="flex-shrink-0 min-w-[80px] sm:min-w-0">Adresses</TabsTrigger>
                <TabsTrigger value="other" className="flex-shrink-0 min-w-[80px] sm:min-w-0">Autres</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de contact</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="supplier">Fournisseur</SelectItem>
                          <SelectItem value="both">Client et Fournisseur</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company Search - only show when creating */}
                {!isEditing && (
                  <CompanySearch onSelect={handleCompanySelect} />
                )}

                {/* Auto-fill success message */}
                {isAutoFilled && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Informations récupérées automatiquement. Vous pouvez les modifier si besoin.</span>
                    </p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'entreprise</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Dupont" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="contact@exemple.fr" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="01 23 45 67 89" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="siren"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIREN</FormLabel>
                        <FormControl>
                          <Input placeholder="123456789" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="siret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIRET</FormLabel>
                        <FormControl>
                          <Input placeholder="12345678901234" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vat_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>N° TVA intracommunautaire</FormLabel>
                        <FormControl>
                          <Input placeholder="FR12345678901" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="naf_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code NAF/APE</FormLabel>
                        <FormControl>
                          <Input placeholder="62.01Z" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="legal_form"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forme juridique</FormLabel>
                      <FormControl>
                        <Input placeholder="SASU, SARL, SAS..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="address" className="space-y-6 mt-4">
                <div>
                  <h4 className="font-medium mb-3">Adresse de facturation</h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="billing_address_line1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse</FormLabel>
                          <FormControl>
                            <Input placeholder="123 rue Exemple" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="billing_address_line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complément d'adresse</FormLabel>
                          <FormControl>
                            <Input placeholder="Bâtiment A" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="billing_postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code postal</FormLabel>
                            <FormControl>
                              <Input placeholder="75001" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billing_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ville</FormLabel>
                            <FormControl>
                              <Input placeholder="Paris" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="billing_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays</FormLabel>
                          <FormControl>
                            <Input placeholder="France" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyBillingToShipping}
                    className="text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copier vers l'adresse de livraison
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Adresse de livraison</h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="shipping_address_line1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse</FormLabel>
                          <FormControl>
                            <Input placeholder="123 rue Exemple" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shipping_address_line2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complément d'adresse</FormLabel>
                          <FormControl>
                            <Input placeholder="Bâtiment A" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shipping_postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code postal</FormLabel>
                            <FormControl>
                              <Input placeholder="75001" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="shipping_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ville</FormLabel>
                            <FormControl>
                              <Input placeholder="Paris" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="shipping_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays</FormLabel>
                          <FormControl>
                            <Input placeholder="France" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="other" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Délai de paiement (jours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0} 
                          {...field} 
                          value={field.value ?? ''} 
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes internes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informations complémentaires..."
                          className="min-h-[100px]"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading
                  ? 'Enregistrement...'
                  : isEditing
                  ? 'Enregistrer'
                  : 'Créer le contact'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
