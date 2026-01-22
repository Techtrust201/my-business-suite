import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, Building2 } from 'lucide-react';
import { useCreateProspect, useUpdateProspect, type ProspectWithStatus } from '@/hooks/useProspects';
import { useActiveProspectStatuses } from '@/hooks/useProspectStatuses';
import { useAddressSearch } from '@/hooks/useGeocoding';
import { geocodeAddress } from '@/lib/geocodeService';
import { toast } from 'sonner';
import { CompanySearch } from '@/components/clients/CompanySearch';
import { type CompanySearchResult } from '@/hooks/useCompanySearch';

const prospectSchema = z.object({
  company_name: z.string().min(1, 'Nom requis'),
  siren: z.string().optional(),
  siret: z.string().optional(),
  vat_number: z.string().optional(),
  legal_form: z.string().optional(),
  naf_code: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('FR'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  status_id: z.string().optional().nullable(),
  assigned_to_user_id: z.string().optional().nullable(),
  contact_id: z.string().optional().nullable(),
  source: z.string().default('terrain'),
  website: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type ProspectFormData = z.infer<typeof prospectSchema>;

interface ProspectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect?: ProspectWithStatus | null;
}

const SOURCE_OPTIONS = [
  { value: 'terrain', label: 'Terrain' },
  { value: 'web', label: 'Web' },
  { value: 'referral', label: 'Recommandation' },
  { value: 'import', label: 'Import' },
  { value: 'other', label: 'Autre' },
];

export function ProspectForm({ open, onOpenChange, prospect }: ProspectFormProps) {
  const isEditing = !!prospect;
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  const { data: statuses } = useActiveProspectStatuses();
  const createProspect = useCreateProspect();
  const updateProspect = useUpdateProspect();

  const form = useForm<ProspectFormData>({
    resolver: zodResolver(prospectSchema),
    defaultValues: {
      company_name: '',
      source: 'terrain',
      country: 'FR',
    },
  });

  // Reset form when prospect changes
  useEffect(() => {
    if (prospect) {
      form.reset({
        company_name: prospect.company_name,
        siren: prospect.siren || '',
        siret: prospect.siret || '',
        vat_number: prospect.vat_number || '',
        legal_form: prospect.legal_form || '',
        naf_code: prospect.naf_code || '',
        address_line1: prospect.address_line1 || '',
        address_line2: prospect.address_line2 || '',
        city: prospect.city || '',
        postal_code: prospect.postal_code || '',
        country: prospect.country || 'FR',
        latitude: prospect.latitude,
        longitude: prospect.longitude,
        status_id: prospect.status_id,
        source: prospect.source || 'terrain',
        website: prospect.website || '',
        phone: prospect.phone || '',
        email: prospect.email || '',
        notes: prospect.notes || '',
      });
      setIsAutoFilled(false);
    } else {
      form.reset({
        company_name: '',
        source: 'terrain',
        country: 'FR',
        status_id: statuses?.find((s) => s.is_default)?.id || null,
      });
      setIsAutoFilled(false);
    }
  }, [prospect, form, statuses, open]);

  const handleCompanySelect = (company: CompanySearchResult) => {
    form.setValue('company_name', company.nom_complet || company.nom_raison_sociale || '');
    form.setValue('siren', company.siren || '');
    form.setValue('siret', company.siret || '');
    form.setValue('legal_form', company.libelle_nature_juridique || company.nature_juridique || '');
    form.setValue('naf_code', company.activite_principale || '');
    
    // Address from siege
    if (company.siege?.adresse) {
      form.setValue('address_line1', company.siege.adresse);
    }
    if (company.siege?.code_postal) {
      form.setValue('postal_code', company.siege.code_postal);
    }
    if (company.siege?.libelle_commune) {
      form.setValue('city', company.siege.libelle_commune);
    }

    // Calculate VAT number from SIREN
    if (company.siren) {
      const siren = company.siren.replace(/\s/g, '');
      const key = (12 + 3 * (parseInt(siren) % 97)) % 97;
      const vatNumber = `FR${key.toString().padStart(2, '0')}${siren}`;
      form.setValue('vat_number', vatNumber);
    }

    setIsAutoFilled(true);
  };

  const handleGeocode = async () => {
    const address = form.getValues('address_line1');
    const city = form.getValues('city');
    const postalCode = form.getValues('postal_code');

    if (!address && !city) {
      toast.error('Veuillez renseigner une adresse');
      return;
    }

    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(address || '', city || undefined, postalCode || undefined);
      if (result) {
        form.setValue('latitude', result.latitude);
        form.setValue('longitude', result.longitude);
        toast.success('Adresse géocodée avec succès');
      } else {
        toast.error('Adresse non trouvée');
      }
    } catch (error) {
      toast.error('Erreur lors du géocodage');
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = async (data: ProspectFormData) => {
    // Auto-geocode if address is set but no coordinates
    if ((data.address_line1 || data.city) && !data.latitude && !data.longitude) {
      const result = await geocodeAddress(
        data.address_line1 || '',
        data.city || undefined,
        data.postal_code || undefined
      );
      if (result) {
        data.latitude = result.latitude;
        data.longitude = result.longitude;
      }
    }

    const submitData = {
      company_name: data.company_name,
      siren: data.siren || null,
      siret: data.siret || null,
      vat_number: data.vat_number || null,
      legal_form: data.legal_form || null,
      naf_code: data.naf_code || null,
      address_line1: data.address_line1 || null,
      address_line2: data.address_line2 || null,
      city: data.city || null,
      postal_code: data.postal_code || null,
      country: data.country || 'FR',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      status_id: data.status_id || null,
      assigned_to_user_id: data.assigned_to_user_id || null,
      contact_id: data.contact_id || null,
      source: data.source || 'terrain',
      website: data.website || null,
      phone: data.phone || null,
      email: data.email || null,
      notes: data.notes || null,
    };

    if (isEditing && prospect) {
      await updateProspect.mutateAsync({ id: prospect.id, ...submitData });
    } else {
      await createProspect.mutateAsync(submitData);
    }

    onOpenChange(false);
  };

  const hasCoordinates = !!form.watch('latitude') && !!form.watch('longitude');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le prospect' : 'Nouveau prospect'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations du prospect'
              : 'Ajoutez une nouvelle entreprise à prospecter'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEditing && (
              <div className="space-y-2">
                <FormLabel>Recherche d'entreprise</FormLabel>
                <CompanySearch onSelect={handleCompanySelect} />
                {isAutoFilled && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Données auto-remplies depuis l'annuaire
                  </p>
                )}
              </div>
            )}

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="address">Adresse</TabsTrigger>
                <TabsTrigger value="other">Autres</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'entreprise *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ma Société SAS" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut commercial</FormLabel>
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un statut" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statuses?.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: status.color }}
                                  />
                                  {status.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SOURCE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" placeholder="+33 1 23 45 67 89" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="contact@example.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site web</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://www.example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="address" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="address_line1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 rue Example" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address_line2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complément d'adresse</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Bâtiment A, Étage 3" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code postal</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="75001" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Paris" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                  <MapPin className={`h-5 w-5 ${hasCoordinates ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    {hasCoordinates ? (
                      <p className="text-sm text-green-600">
                        Géolocalisé : {form.watch('latitude')?.toFixed(5)}, {form.watch('longitude')?.toFixed(5)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Non géolocalisé
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeocode}
                    disabled={isGeocoding}
                  >
                    {isGeocoding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-1" />
                        Géolocaliser
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="other" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="siren"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIREN</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 456 789" />
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
                          <Input {...field} placeholder="123 456 789 00001" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vat_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>N° TVA</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="FR12345678901" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="legal_form"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forme juridique</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="SAS" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="naf_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code NAF</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="62.01Z" />
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
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Notes sur le prospect..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createProspect.isPending || updateProspect.isPending}
              >
                {(createProspect.isPending || updateProspect.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Enregistrer' : 'Créer le prospect'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
