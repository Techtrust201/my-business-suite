import { useEffect, useState } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuote, useCreateQuote, useUpdateQuote, calculateTotals } from '@/hooks/useQuotes';
import { useClients } from '@/hooks/useClients';
import { useArticles, useTaxRates } from '@/hooks/useArticles';
import { Loader2, Plus, Trash2, CalendarIcon, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const lineSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.coerce.number().min(0.01, 'Quantité requise'),
  unit_price: z.coerce.number().min(0, 'Prix requis'),
  tax_rate: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100).optional(),
  item_id: z.string().optional(),
});

const quoteSchema = z.object({
  contact_id: z.string().optional(),
  subject: z.string().optional(),
  date: z.date(),
  valid_until: z.date().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Au moins une ligne requise'),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteFormProps {
  quoteId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuoteForm = ({ quoteId, open, onOpenChange }: QuoteFormProps) => {
  const isEditing = !!quoteId;
  const { data: quote, isLoading: isLoadingQuote } = useQuote(quoteId ?? undefined);
  const { data: clients } = useClients({ type: 'client' });
  const { articles } = useArticles();
  const { data: taxRates } = useTaxRates();
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();

  const defaultTaxRate = taxRates?.find((t) => t.is_default)?.rate || 20;

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      contact_id: undefined,
      subject: '',
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
    if (quote && isEditing) {
      form.reset({
        contact_id: quote.contact_id || undefined,
        subject: quote.subject || '',
        date: new Date(quote.date),
        valid_until: quote.valid_until ? new Date(quote.valid_until) : undefined,
        notes: quote.notes || '',
        terms: quote.terms || '',
        lines: quote.quote_lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          tax_rate: Number(line.tax_rate),
          discount_percent: Number(line.discount_percent) || 0,
          item_id: line.item_id || undefined,
        })),
      });
    } else if (!isEditing && open) {
      form.reset({
        contact_id: undefined,
        subject: '',
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
  }, [quote, isEditing, open, form, defaultTaxRate]);

  const handleAddArticle = (articleId: string) => {
    const article = articles?.find((a) => a.id === articleId);
    if (article) {
      const taxRate = taxRates?.find((t) => t.id === article.tax_rate_id)?.rate || defaultTaxRate;
      append({
        description: article.name + (article.description ? ` - ${article.description}` : ''),
        quantity: 1,
        unit_price: article.unit_price,
        tax_rate: taxRate,
        discount_percent: 0,
        item_id: article.id,
      });
    }
  };

  const handleSubmit = (values: QuoteFormValues) => {
    const formData = {
      contact_id: values.contact_id === 'none' ? undefined : values.contact_id,
      subject: values.subject,
      date: format(values.date, 'yyyy-MM-dd'),
      valid_until: values.valid_until ? format(values.valid_until, 'yyyy-MM-dd') : undefined,
      notes: values.notes,
      terms: values.terms,
      lines: values.lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        discount_percent: line.discount_percent,
        // Only include item_id if it's a valid UUID, otherwise set to null
        item_id: line.item_id && line.item_id.length > 0 ? line.item_id : null,
      })),
    };

    if (isEditing && quoteId) {
      updateQuote.mutate(
        { id: quoteId, ...formData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createQuote.mutate(formData, { onSuccess: () => onOpenChange(false) });
    }
  };

  const watchedLines = form.watch('lines');
  const totals = calculateTotals(watchedLines?.map(l => ({
    description: l.description || '',
    quantity: l.quantity || 0,
    unit_price: l.unit_price || 0,
    tax_rate: l.tax_rate || 0,
    discount_percent: l.discount_percent,
  })) || []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const isLoading = createQuote.isPending || updateQuote.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {isEditing ? 'Modifier le devis' : 'Nouveau devis'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingQuote && isEditing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <ScrollArea className="h-[calc(95vh-180px)] px-6">
                <div className="space-y-6 pb-6">
                  {/* Header info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || 'none'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Aucun client</SelectItem>
                              {clients?.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.company_name || `${client.first_name} ${client.last_name}`}
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
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sujet</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Développement site web" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date du devis</FormLabel>
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
                                    format(field.value, 'PPP', { locale: fr })
                                  ) : (
                                    <span>Choisir une date</span>
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
                        <FormItem className="flex flex-col">
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
                                    format(field.value, 'PPP', { locale: fr })
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
                      <h3 className="text-lg font-medium">Lignes du devis</h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="sm">
                            <Package className="mr-2 h-4 w-4" />
                            Ajouter un article
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="end">
                          <div className="p-2">
                            <p className="text-sm font-medium mb-2">Articles du catalogue</p>
                            <ScrollArea className="h-[200px]">
                              {articles?.map((article) => (
                                <button
                                  key={article.id}
                                  type="button"
                                  onClick={() => handleAddArticle(article.id)}
                                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm flex justify-between items-center"
                                >
                                  <span className="truncate">{article.name}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {formatPrice(article.unit_price)}
                                  </span>
                                </button>
                              ))}
                              {!articles?.length && (
                                <p className="text-sm text-muted-foreground p-2">
                                  Aucun article dans le catalogue
                                </p>
                              )}
                            </ScrollArea>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="col-span-12 md:col-span-5">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Description" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
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
                          </div>
                          <div className="col-span-4 md:col-span-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.unit_price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Prix HT"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-3 md:col-span-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.tax_rate`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(val) => field.onChange(Number(val))}
                                    value={field.value !== undefined && field.value !== null ? String(field.value) : String(defaultTaxRate)}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="TVA" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {taxRates?.filter(rate => rate.rate !== undefined && rate.rate !== null).map((rate) => (
                                        <SelectItem key={rate.id} value={String(rate.rate)}>
                                          {rate.rate}%
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
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
                    </div>

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
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter une ligne
                    </Button>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-full max-w-xs space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sous-total HT</span>
                        <span>{formatPrice(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TVA</span>
                        <span>{formatPrice(totals.taxAmount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>Total TTC</span>
                        <span>{formatPrice(totals.total)}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Notes & Terms */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes internes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notes visibles uniquement par vous..."
                              className="resize-none"
                              rows={3}
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
                              placeholder="Conditions de vente, mentions légales..."
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 p-6 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Enregistrer' : 'Créer le devis'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
