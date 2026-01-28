import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { Badge } from '@/components/ui/badge';
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
import { useInvoice, useCreateInvoice, useUpdateInvoice, calculateTotals, calculateLineTotal } from '@/hooks/useInvoices';
import { useClients, useClient } from '@/hooks/useClients';
import { useArticles, useTaxRates } from '@/hooks/useArticles';
import { useOrganization } from '@/hooks/useOrganization';
import { Loader2, Plus, X, CalendarIcon, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArticlePicker } from '@/components/shared/ArticlePicker';
import { InvoicePreview } from './InvoicePreview';
import { DocumentOptionsSidebar } from '@/components/shared/DocumentOptionsSidebar';
import { Controller, useFormContext } from 'react-hook-form';

const lineSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.coerce.number().min(0.01, 'Quantité requise'),
  unit_price: z.coerce.number().min(0, 'Prix requis'),
  tax_rate: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100).optional(),
  discount_amount: z.coerce.number().min(0).optional(),
  item_id: z.string().optional(),
});

const invoiceSchema = z.object({
  contact_id: z.string().optional(),
  subject: z.string().optional(),
  purchase_order_number: z.string().optional(),
  date: z.date(),
  due_date: z.date().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Au moins une ligne requise'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoiceId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Composant d'édition de ligne pour les factures
function InvoiceLineEditor({
  index,
  canDelete,
  onDelete,
  onDuplicate,
  taxRates,
  defaultTaxRate,
  typeCount,
}: {
  index: number;
  canDelete: boolean;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  taxRates?: Array<{ id: string; rate: number }>;
  defaultTaxRate: number;
  typeCount?: number;
}) {
  const { control, watch, setValue } = useFormContext<InvoiceFormValues>();
  const line = watch(`lines.${index}`);
  const quantity = watch(`lines.${index}.quantity`) || 0;
  const unitPrice = watch(`lines.${index}.unit_price`) || 0;
  
  const lineTotal = useMemo(() => {
    if (!line) return 0;
    return calculateLineTotal(line);
  }, [line]);

  // Fonctions de calcul pour la synchronisation remise
  const calculateDiscountAmount = (percent: number): number => {
    if (!percent || percent <= 0) return 0;
    const subtotal = quantity * unitPrice;
    return (subtotal * percent) / 100;
  };
  
  const calculateDiscountPercent = (amount: number): number => {
    if (!amount || amount <= 0) return 0;
    const subtotal = quantity * unitPrice;
    if (subtotal === 0) return 0;
    return (amount / subtotal) * 100;
  };

  function formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }

  const displayCount = typeCount !== undefined ? typeCount : index + 1;

  // Composant d'en-tête de ligne
  const LineHeader = () => (
    <div className="flex items-center justify-between mb-3 pb-2 border-b">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Ligne {index + 1}
        </span>
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
          <span className="mr-1">🏷️</span>
          Article #{displayCount}
        </Badge>
      </div>
    </div>
  );

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <LineHeader />
      <Controller
        control={control}
        name={`lines.${index}.description`}
        render={({ field, fieldState }) => (
          <div>
            <Input
              {...field}
              placeholder="Description de la prestation"
              className="w-full"
            />
            {fieldState.error && (
              <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Quantité
          </label>
          <Controller
            control={control}
            name={`lines.${index}.quantity`}
            render={({ field, fieldState }) => (
              <div>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Qté"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Prix unitaire HT
          </label>
          <Controller
            control={control}
            name={`lines.${index}.unit_price`}
            render={({ field, fieldState }) => (
              <div>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Prix HT"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Remise %
          </label>
          <Controller
            control={control}
            name={`lines.${index}.discount_percent`}
            render={({ field }) => (
              <div className="relative">
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Remise %"
                  className="pr-6"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const percent = e.target.value ? Number(e.target.value) : 0;
                    field.onChange(percent);
                    // Synchroniser avec le montant en €
                    const amount = calculateDiscountAmount(percent);
                    setValue(`lines.${index}.discount_amount`, amount, { shouldValidate: false });
                  }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            )}
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Remise €
          </label>
          <Controller
            control={control}
            name={`lines.${index}.discount_amount`}
            render={({ field }) => (
              <div className="relative">
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Remise €"
                  className="pr-6"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const amount = e.target.value ? Number(e.target.value) : 0;
                    field.onChange(amount);
                    // Synchroniser avec le pourcentage
                    const percent = calculateDiscountPercent(amount);
                    setValue(`lines.${index}.discount_percent`, percent, { shouldValidate: false });
                  }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              </div>
            )}
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            TVA
          </label>
          <Controller
            control={control}
            name={`lines.${index}.tax_rate`}
            render={({ field }) => (
              <Select
                onValueChange={(val) => field.onChange(Number(val.replace('rate-', '')))}
                value={field.value !== undefined && field.value !== null ? `rate-${field.value}` : `rate-${defaultTaxRate}`}
              >
                <SelectTrigger>
                  <SelectValue placeholder="TVA" />
                </SelectTrigger>
                <SelectContent>
                  {taxRates?.filter(rate => rate.rate !== undefined && rate.rate !== null).map((rate) => (
                    <SelectItem key={rate.id} value={`rate-${rate.rate}`}>
                      {rate.rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {lineTotal > 0 && (
        <div className="text-sm text-muted-foreground font-medium">
          Montant HT: <span className="font-mono">{formatPrice(lineTotal)}</span>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDuplicate(index)}
        >
          <Copy className="h-4 w-4 mr-2" />
          Dupliquer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(index)}
          disabled={!canDelete}
        >
          <Trash2 className="h-4 w-4 mr-2 text-destructive" />
          Supprimer
        </Button>
      </div>
    </div>
  );
}

export const InvoiceForm = ({ invoiceId, open, onOpenChange }: InvoiceFormProps) => {
  const isEditing = !!invoiceId;
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(invoiceId ?? undefined);
  const { data: clients } = useClients({ type: 'client' });
  const { articles } = useArticles();
  const { data: taxRates } = useTaxRates();
  const { organization } = useOrganization();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  
  const [documentOptions, setDocumentOptions] = useState({
    language: 'fr',
    showSignature: true,
    showConditions: true,
    showFreeField: false,
    showGlobalDiscount: false,
    conditionsText: '',
    freeFieldContent: '',
  });

  const defaultTaxRate = taxRates?.find((t) => t.is_default)?.rate || 20;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      contact_id: undefined,
      subject: '',
      purchase_order_number: '',
      date: new Date(),
      due_date: undefined,
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

  // Synchroniser le champ terms du formulaire avec conditionsText dans les options
  const termsValue = form.watch('terms');
  useEffect(() => {
    if (termsValue !== undefined && documentOptions.conditionsText !== termsValue) {
      setDocumentOptions((prev) => ({ ...prev, conditionsText: termsValue }));
    }
  }, [termsValue, documentOptions.conditionsText]);

  // Watch form data for preview
  const watchedFormData = form.watch();
  const watchedContactId = form.watch('contact_id');
  const { data: selectedClient } = useClient(watchedContactId || undefined);

  useEffect(() => {
    if (invoice && isEditing) {
      form.reset({
        contact_id: invoice.contact_id || undefined,
        subject: invoice.subject || '',
        purchase_order_number: invoice.purchase_order_number || '',
        date: new Date(invoice.date),
        due_date: invoice.due_date ? new Date(invoice.due_date) : undefined,
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        lines: invoice.invoice_lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          tax_rate: Number(line.tax_rate),
          discount_percent: Number(line.discount_percent) || 0,
          item_id: line.item_id || undefined,
        })),
      });
      // Initialiser les options avec les conditions existantes
      setDocumentOptions((prev) => ({
        ...prev,
        conditionsText: invoice.terms || '',
      }));
    } else if (!isEditing && open) {
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      
      form.reset({
        contact_id: undefined,
        subject: '',
        purchase_order_number: '',
        date: new Date(),
        due_date: defaultDueDate,
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
  }, [invoice, isEditing, open, form, defaultTaxRate]);

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

  const handleDuplicate = useCallback((index: number) => {
    const lineData = form.getValues(`lines.${index}`);
    append({
      ...lineData,
      description: `${lineData.description} (copie)`,
    });
  }, [form, append]);

  const handleSubmit = (values: InvoiceFormValues) => {
    const formData = {
      contact_id: values.contact_id === 'none' ? undefined : values.contact_id,
      subject: values.subject,
      purchase_order_number: values.purchase_order_number,
      date: format(values.date, 'yyyy-MM-dd'),
      due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
      notes: values.notes,
      terms: values.terms,
      lines: values.lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        discount_percent: line.discount_percent,
        item_id: line.item_id && line.item_id.length > 0 ? line.item_id : null,
      })),
    };

    if (isEditing && invoiceId) {
      updateInvoice.mutate(
        { id: invoiceId, ...formData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createInvoice.mutate(formData, { onSuccess: () => onOpenChange(false) });
    }
  };

  const watchedLines = form.watch('lines');
  const totals = useMemo(() => calculateTotals(watchedLines || []), [watchedLines]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const isLoading = createInvoice.isPending || updateInvoice.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header fixe en haut */}
      <div className="border-b p-4 flex justify-between items-center bg-background">
        <h1 className="text-xl font-semibold">
          {isEditing ? 'Modifier la facture' : 'Nouvelle facture'}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {isLoadingInvoice && isEditing ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Colonne gauche: Aperçu (60%) */}
          <div className="w-full lg:w-[60%] lg:border-r border-b lg:border-b-0 p-4 lg:p-6 overflow-y-auto bg-muted/20">
            <InvoicePreview
              formData={{
                contact_id: watchedFormData.contact_id,
                subject: watchedFormData.subject,
                purchase_order_number: watchedFormData.purchase_order_number,
                date: watchedFormData.date,
                due_date: watchedFormData.due_date,
                notes: watchedFormData.notes,
                terms: watchedFormData.terms,
                lines: watchedLines || [],
              }}
              organization={organization}
              client={selectedClient || null}
              totals={totals}
              invoiceNumber={invoice?.number}
              options={documentOptions}
            />
          </div>

          {/* Colonne droite: Formulaire (40%) */}
          <div className="w-full lg:w-[40%] p-4 lg:p-6 overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* En-tête */}
                <div className="space-y-4">
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
                    name="purchase_order_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>N° Bon de commande</FormLabel>
                        <FormControl>
                          <Input placeholder="Référence client (optionnel)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sujet / Objet</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Développement site web" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date de facture</FormLabel>
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
                      name="due_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date d'échéance</FormLabel>
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
                </div>

                <Separator />

                {/* Gestion des lignes */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base font-medium">Lignes de facture</h3>
                    <ArticlePicker
                      articles={articles}
                      onSelect={handleAddArticle}
                      buttonLabel="Ajouter un article"
                      buttonSize="sm"
                    />
                  </div>

                  <div className="space-y-3">
                    {fields.map((field, index) => {
                      // Pour les factures, toutes les lignes sont des articles
                      const getLineTypeCount = (idx: number) => {
                        return idx + 1; // Toutes les lignes sont des articles, donc compteur simple
                      };
                      
                      return (
                        <InvoiceLineEditor
                          key={field.id}
                          index={index}
                          canDelete={fields.length > 1}
                          onDelete={remove}
                          onDuplicate={handleDuplicate}
                          taxRates={taxRates}
                          defaultTaxRate={defaultTaxRate}
                          typeCount={getLineTypeCount(index)}
                        />
                      );
                    })}
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

                <Separator />

                {/* Totaux */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total HT</span>
                    <span>{formatPrice(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TVA</span>
                    <span>{formatPrice(totals.taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total TTC</span>
                    <span>{formatPrice(totals.total)}</span>
                  </div>
                </div>

                {/* Options complémentaires */}
                <DocumentOptionsSidebar
                  type="invoice"
                  options={documentOptions}
                  onOptionsChange={(newOptions) => {
                    setDocumentOptions({ ...documentOptions, ...newOptions });
                    // Synchroniser conditionsText avec le champ terms du formulaire
                    if (newOptions.conditionsText !== undefined) {
                      form.setValue('terms', newOptions.conditionsText);
                    }
                  }}
                  onConditionsChange={(text) => {
                    form.setValue('terms', text);
                  }}
                />

                <Separator />

                {/* Notes et conditions */}
                <div className="grid grid-cols-1 gap-4">
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
                        <FormLabel>Conditions de paiement</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Conditions de paiement, mentions légales..."
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

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="w-full sm:w-auto"
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Enregistrer' : 'Créer la facture'}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
};
