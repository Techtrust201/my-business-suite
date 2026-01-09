import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOrganization } from '@/hooks/useOrganization';
import { useUpdateBanking } from '@/hooks/useUpdateOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const formSchema = z.object({
  rib: z.string().optional(),
  bic: z.string().optional(),
  bank_details: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function BankingForm() {
  const { organization } = useOrganization();
  const updateBanking = useUpdateBanking();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rib: '',
      bic: '',
      bank_details: '',
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        rib: organization.rib || '',
        bic: organization.bic || '',
        bank_details: organization.bank_details || '',
      });
    }
  }, [organization, form]);

  const onSubmit = (data: FormData) => {
    updateBanking.mutate({
      rib: data.rib || null,
      bic: data.bic || null,
      bank_details: data.bank_details || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Coordonnées bancaires
        </CardTitle>
        <CardDescription>
          Ces informations apparaîtront sur vos factures pour les paiements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rib"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="FR76 1234 5678 9012 3456 7890 123" />
                  </FormControl>
                  <FormDescription>
                    Votre numéro de compte bancaire international
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>BIC / SWIFT</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="BNPAFRPP" />
                  </FormControl>
                  <FormDescription>
                    Code d'identification de votre banque
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bank_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informations bancaires additionnelles</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Nom de la banque, titulaire du compte, etc."
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Informations complémentaires à afficher sur les factures
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={updateBanking.isPending}>
                {updateBanking.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
