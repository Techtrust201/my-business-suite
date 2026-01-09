import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOrganization } from '@/hooks/useOrganization';
import { useUpdateBillingSettings } from '@/hooks/useUpdateOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const formSchema = z.object({
  currency: z.string().min(1, 'Devise requise'),
  invoice_prefix: z.string().min(1, 'Préfixe requis'),
  quote_prefix: z.string().min(1, 'Préfixe requis'),
  default_payment_terms: z.coerce.number().min(0, 'Doit être positif'),
  legal_mentions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const currencies = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar US ($)' },
  { value: 'GBP', label: 'Livre Sterling (£)' },
  { value: 'CHF', label: 'Franc Suisse (CHF)' },
  { value: 'CAD', label: 'Dollar Canadien (CAD)' },
];

export function BillingSettingsForm() {
  const { organization } = useOrganization();
  const updateBillingSettings = useUpdateBillingSettings();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currency: 'EUR',
      invoice_prefix: 'FAC-',
      quote_prefix: 'DEV-',
      default_payment_terms: 30,
      legal_mentions: '',
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        currency: organization.currency || 'EUR',
        invoice_prefix: organization.invoice_prefix || 'FAC-',
        quote_prefix: organization.quote_prefix || 'DEV-',
        default_payment_terms: organization.default_payment_terms || 30,
        legal_mentions: organization.legal_mentions || '',
      });
    }
  }, [organization, form]);

  const onSubmit = (data: FormData) => {
    updateBillingSettings.mutate({
      currency: data.currency,
      invoice_prefix: data.invoice_prefix,
      quote_prefix: data.quote_prefix,
      default_payment_terms: data.default_payment_terms,
      legal_mentions: data.legal_mentions || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Paramètres de facturation
        </CardTitle>
        <CardDescription>
          Configuration des devis et factures
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Devise</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une devise" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map(currency => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
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
                name="default_payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Délai de paiement (jours)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} />
                    </FormControl>
                    <FormDescription>
                      Délai par défaut pour les nouvelles factures
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="invoice_prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Préfixe des factures</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="FAC-" />
                    </FormControl>
                    <FormDescription>
                      Ex: FAC-2024-001
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quote_prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Préfixe des devis</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DEV-" />
                    </FormControl>
                    <FormDescription>
                      Ex: DEV-2024-001
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="legal_mentions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mentions légales</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Pénalités de retard, conditions générales, etc."
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    Ces mentions apparaîtront en bas de vos factures
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={updateBillingSettings.isPending}>
                {updateBillingSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
