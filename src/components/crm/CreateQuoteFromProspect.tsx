import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCreateQuote, calculateTotals, type QuoteLineInput } from '@/hooks/useQuotes';
import { useArticles, useTaxRates } from '@/hooks/useArticles';
import { Loader2, Plus, Trash2, CalendarIcon, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArticlePicker } from '@/components/shared/ArticlePicker';
import type { ProspectWithStatus } from '@/hooks/useProspects';

const lineSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.coerce.number().min(0.01, 'Quantité requise'),
  unit_price: z.coerce.number().min(0, 'Prix requis'),
  tax_rate: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100).optional(),
  item_id: z.string().optional(),
});

const quoteSchema = z.object({
  subject: z.string().optional(),
  date: z.date(),
  valid_until: z.date().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Au moins une ligne requise'),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface CreateQuoteFromProspectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: ProspectWithStatus;
  onSuccess?: () => void;
}

export function CreateQuoteFromProspect({
  open,
  onOpenChange,
  prospect,
  onSuccess,
}: CreateQuoteFromProspectProps) {
  const { articles } = useArticles();
  const { data: taxRates } = useTaxRates();
  const createQuote = useCreateQuote();

  const defaultTaxRate = taxRates?.find((t) => t.is_default)?.rate || 20;

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      subject: `Devis pour ${prospect.company_name}`,
      date: new Date(),
      valid_until: undefined,
      notes: '',
      terms: '',
      lines: [
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          tax_rate: defaultTaxRate,
          discount_percent: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  useEffect(() => {
    if (open) {
      form.reset({
        subject: `Devis pour ${prospect.company_name}`,
        date: new Date(),
        valid_until: undefined,
        notes: '',
        terms: '',
        lines: [
          {
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: defaultTaxRate,
            discount_percent: 0,
          },
        ],
      });
    }
  }, [open, prospect.company_name, form, defaultTaxRate]);

  const handleAddArticle = (articleId: string) => {
    const article = articles?.find((a) => a.id === articleId);
    if (article) {
      const taxRate = taxRates?.find((t) => t.id === article.tax_rate_id)?.rate || defaultTaxRate;
      append({
        description: article.name,
        quantity: 1,
        unit_price: Number(article.unit_price),
        tax_rate: taxRate,
        discount_percent: 0,
        item_id: article.id,
      });
    }
  };

  const handleSubmit = async (values: QuoteFormValues) => {
    if (values.lines.length === 0) {
      return;
    }

    // Transform form lines to QuoteLineInput format
    const quoteLines: QuoteLineInput[] = values.lines.map((line, index) => ({
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      tax_rate: line.tax_rate,
      discount_percent: line.discount_percent,
      item_id: line.item_id,
      position: index,
    }));

    try {
      await createQuote.mutateAsync({
        // Use contact_id if prospect is already converted
        contact_id: prospect.contact_id || undefined,
        subject: values.subject || `Devis pour ${prospect.company_name}`,
        date: format(values.date, 'yyyy-MM-dd'),
        valid_until: values.valid_until ? format(values.valid_until, 'yyyy-MM-dd') : undefined,
        notes: values.notes ? `[Prospect: ${prospect.company_name}]\n${values.notes}` : `[Prospect: ${prospect.company_name}]`,
        terms: values.terms,
        lines: quoteLines,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating quote:', error);
    }
  };

  const watchedLines = form.watch('lines');
  
  // Transform watched lines for totals calculation
  const linesForTotals: QuoteLineInput[] = (watchedLines || []).map((line) => ({
    description: line.description || '',
    quantity: line.quantity || 0,
    unit_price: line.unit_price || 0,
    tax_rate: line.tax_rate || 0,
    discount_percent: line.discount_percent,
  }));
  
  const totals = calculateTotals(linesForTotals);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const isLoading = createQuote.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau devis prospect</DialogTitle>
          <DialogDescription>
            Créez un devis pour ce prospect. Il sera converti en devis client lors de la conversion.
          </DialogDescription>
        </DialogHeader>

        {/* Prospect Info Badge */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">{prospect.company_name}</p>
            <p className="text-sm text-muted-foreground">
              {[prospect.city, prospect.postal_code].filter(Boolean).join(' • ')}
            </p>
          </div>
          {prospect.status && (
            <Badge style={{ backgroundColor: prospect.status.color, color: 'white' }}>
              {prospect.status.name}
            </Badge>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Subject and dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="md:col-span-1">
                    <FormLabel>Objet</FormLabel>
                    <FormControl>
                      <Input placeholder="Objet du devis" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'P', { locale: fr })
                            ) : (
                              <span>Sélectionner</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valide jusqu'au</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'P', { locale: fr })
                            ) : (
                              <span>Optionnel</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Lignes du devis</h3>
                <ArticlePicker articles={articles} onSelect={handleAddArticle} />
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-2 items-start p-3 bg-muted/50 rounded-lg"
                >
                  <FormField
                    control={form.control}
                    name={`lines.${index}.description`}
                    render={({ field }) => (
                      <FormItem className="col-span-12 md:col-span-4">
                        <FormLabel className="sr-only">Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="col-span-3 md:col-span-2">
                        <FormLabel className="sr-only">Quantité</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Qté"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.unit_price`}
                    render={({ field }) => (
                      <FormItem className="col-span-4 md:col-span-2">
                        <FormLabel className="sr-only">Prix unitaire</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Prix"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.tax_rate`}
                    render={({ field }) => (
                      <FormItem className="col-span-3 md:col-span-2">
                        <FormLabel className="sr-only">TVA</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="TVA %"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-1 md:col-span-1 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: '',
                    quantity: 1,
                    unit_price: 0,
                    tax_rate: defaultTaxRate,
                    discount_percent: 0,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une ligne
              </Button>
            </div>

            <Separator />

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total HT</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA</span>
                  <span>{formatPrice(totals.taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium text-base">
                  <span>Total TTC</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (visibles sur le devis)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Conditions de paiement..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer le devis
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
