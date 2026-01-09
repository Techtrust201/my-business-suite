import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Building2, MapPin, Calculator, Palette, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';

const step1Schema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  legal_name: z.string().optional(),
  siret: z.string().optional(),
  vat_number: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
});

const step2Schema = z.object({
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('France'),
});

const step3Schema = z.object({
  currency: z.string().default('EUR'),
  timezone: z.string().default('Europe/Paris'),
  default_payment_terms: z.number().default(30),
  invoice_prefix: z.string().default('FAC-'),
  quote_prefix: z.string().default('DEV-'),
});

const step4Schema = z.object({
  website: z.string().optional(),
  bank_details: z.string().optional(),
  legal_mentions: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;

const steps = [
  { id: 1, title: 'Entreprise', icon: Building2, description: 'Informations générales' },
  { id: 2, title: 'Adresse', icon: MapPin, description: 'Localisation' },
  { id: 3, title: 'Paramètres', icon: Calculator, description: 'Facturation' },
  { id: 4, title: 'Finalisation', icon: Palette, description: 'Détails optionnels' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refetch } = useOrganization();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data & Step4Data>>({
    currency: 'EUR',
    timezone: 'Europe/Paris',
    default_payment_terms: 30,
    invoice_prefix: 'FAC-',
    quote_prefix: 'DEV-',
    country: 'France',
  });

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: formData,
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: formData,
  });

  const form3 = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: formData,
  });

  const form4 = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: formData,
  });

  const handleNext = async (data: Step1Data | Step2Data | Step3Data | Step4Data) => {
    setFormData(prev => ({ ...prev, ...data }));
    
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      await handleSubmit({ ...formData, ...data });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (data: Partial<Step1Data & Step2Data & Step3Data & Step4Data>) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Use RPC function to create organization atomically (bypasses RLS issues)
      const { data: orgId, error: orgError } = await supabase.rpc('create_organization_for_user', {
        _name: data.name!,
        _legal_name: data.legal_name || null,
        _siret: data.siret || null,
        _vat_number: data.vat_number || null,
        _email: data.email || null,
        _phone: data.phone || null,
        _address_line1: data.address_line1 || null,
        _address_line2: data.address_line2 || null,
        _postal_code: data.postal_code || null,
        _city: data.city || null,
        _country: data.country || 'France',
        _currency: data.currency || 'EUR',
        _timezone: data.timezone || 'Europe/Paris',
        _default_payment_terms: data.default_payment_terms || 30,
        _invoice_prefix: data.invoice_prefix || 'FAC',
        _quote_prefix: data.quote_prefix || 'DEV',
        _website: data.website || null,
        _bank_details: data.bank_details || null,
        _legal_mentions: data.legal_mentions || null,
      });

      if (orgError) throw orgError;

      toast.success('Organisation créée avec succès !');
      await refetch();
      navigate('/');
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${currentStep === step.id 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : currentStep > step.id
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                }
              `}
            >
              {currentStep > step.id ? (
                <Check className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div 
                className={`w-12 h-0.5 mx-2 transition-all ${
                  currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground/30'
                }`} 
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <Form {...form1}>
      <form onSubmit={form1.handleSubmit(handleNext)} className="space-y-4">
        <FormField
          control={form1.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de l'organisation *</FormLabel>
              <FormControl>
                <Input placeholder="Ma Société SAS" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form1.control}
          name="legal_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Raison sociale</FormLabel>
              <FormControl>
                <Input placeholder="Ma Société SAS" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form1.control}
            name="siret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SIRET</FormLabel>
                <FormControl>
                  <Input placeholder="123 456 789 00012" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form1.control}
            name="vat_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>N° TVA</FormLabel>
                <FormControl>
                  <Input placeholder="FR12345678901" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form1.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email de contact</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@exemple.fr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form1.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input placeholder="01 23 45 67 89" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit">
            Suivant
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderStep2 = () => (
    <Form {...form2}>
      <form onSubmit={form2.handleSubmit(handleNext)} className="space-y-4">
        <FormField
          control={form2.control}
          name="address_line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse</FormLabel>
              <FormControl>
                <Input placeholder="123 rue de la Paix" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form2.control}
          name="address_line2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complément d'adresse</FormLabel>
              <FormControl>
                <Input placeholder="Bâtiment A, 2ème étage" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form2.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code postal</FormLabel>
                <FormControl>
                  <Input placeholder="75001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form2.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ville</FormLabel>
                <FormControl>
                  <Input placeholder="Paris" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form2.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pays</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un pays" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="Belgique">Belgique</SelectItem>
                  <SelectItem value="Suisse">Suisse</SelectItem>
                  <SelectItem value="Luxembourg">Luxembourg</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button type="submit">
            Suivant
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderStep3 = () => (
    <Form {...form3}>
      <form onSubmit={form3.handleSubmit(handleNext)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form3.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Devise</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EUR">Euro (€)</SelectItem>
                    <SelectItem value="USD">Dollar US ($)</SelectItem>
                    <SelectItem value="GBP">Livre Sterling (£)</SelectItem>
                    <SelectItem value="CHF">Franc Suisse (CHF)</SelectItem>
                    <SelectItem value="CAD">Dollar Canadien (CAD)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form3.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuseau horaire</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Europe/Paris">Paris (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Brussels">Bruxelles (UTC+1)</SelectItem>
                    <SelectItem value="Europe/Zurich">Zurich (UTC+1)</SelectItem>
                    <SelectItem value="America/Montreal">Montréal (UTC-5)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form3.control}
          name="default_payment_terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Délai de paiement par défaut (jours)</FormLabel>
              <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={String(field.value)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Comptant</SelectItem>
                  <SelectItem value="15">15 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="45">45 jours</SelectItem>
                  <SelectItem value="60">60 jours</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form3.control}
            name="invoice_prefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Préfixe factures</FormLabel>
                <FormControl>
                  <Input placeholder="FAC-" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form3.control}
            name="quote_prefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Préfixe devis</FormLabel>
                <FormControl>
                  <Input placeholder="DEV-" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button type="submit">
            Suivant
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderStep4 = () => (
    <Form {...form4}>
      <form onSubmit={form4.handleSubmit(handleNext)} className="space-y-4">
        <FormField
          control={form4.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site web</FormLabel>
              <FormControl>
                <Input placeholder="https://www.exemple.fr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form4.control}
          name="bank_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coordonnées bancaires (RIB/IBAN)</FormLabel>
              <FormControl>
                <Input placeholder="IBAN: FR76 1234 5678 9012 3456 7890 123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form4.control}
          name="legal_mentions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mentions légales (optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="Pénalités de retard, conditions générales..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              <>
                Créer mon organisation
                <Check className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configuration de votre organisation</h1>
          <p className="text-muted-foreground mt-2">
            Remplissez les informations pour commencer à utiliser Factura
          </p>
        </div>

        {renderStepIndicator()}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const StepIcon = steps[currentStep - 1].icon;
                return StepIcon ? <StepIcon className="h-5 w-5 text-primary" /> : null;
              })()}
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
