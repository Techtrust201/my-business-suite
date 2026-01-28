import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableLineItem } from '@/components/shared/SortableLineItem';
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
import { useInvoice, useCreateInvoice, useUpdateInvoice, calculateTotals, calculateLineTotal } from '@/hooks/useInvoices';
import { useClients, useClient } from '@/hooks/useClients';
import { useArticles, useTaxRates } from '@/hooks/useArticles';
import { useOrganization } from '@/hooks/useOrganization';
import { useDefaultBankAccount } from '@/hooks/useBankAccounts';
import { Loader2, Plus, X, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArticlePicker } from '@/components/shared/ArticlePicker';
import { InvoicePreview } from './InvoicePreview';
import { QuoteInvoiceLineEditor } from '@/components/shared/QuoteInvoiceLineEditor';
import { DocumentOptionsSidebar } from '@/components/shared/DocumentOptionsSidebar';

const lineTypeSchema = z.enum(['item', 'text', 'section']).default('item');

const lineSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.coerce.number().min(0),
  unit_price: z.coerce.number().min(0),
  tax_rate: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100).optional(),
  discount_amount: z.coerce.number().min(0).optional(),
  item_id: z.string().optional(),
  purchase_price: z.coerce.number().optional().nullable(),
  line_type: lineTypeSchema,
}).refine(
  (data) => {
    if (data.line_type === 'item') {
      return data.quantity > 0;
    }
    return true;
  },
  { message: 'Quantité requise pour les articles', path: ['quantity'] }
);

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

export const InvoiceForm = ({ invoiceId, open, onOpenChange }: InvoiceFormProps) => {
  const isEditing = !!invoiceId;
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(invoiceId ?? undefined);
  const { data: clients } = useClients({ type: 'client' });
  const { articles } = useArticles();
  const { data: taxRates } = useTaxRates();
  const { organization } = useOrganization();
  const { data: defaultBankAccount } = useDefaultBankAccount();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  
  // Fonction pour formater les informations bancaires depuis le compte bancaire par défaut
  const formatBankInfo = (): string => {
    if (!defaultBankAccount) return '';
    
    const parts: string[] = [];
    if (defaultBankAccount.iban) {
      parts.push(`IBAN: ${defaultBankAccount.iban}`);
    }
    if (defaultBankAccount.bic) {
      parts.push(`BIC: ${defaultBankAccount.bic}`);
    }
    if (defaultBankAccount.account_holder) {
      parts.push(`Titulaire: ${defaultBankAccount.account_holder}`);
    }
    if (defaultBankAccount.bank_name) {
      parts.push(`Banque: ${defaultBankAccount.bank_name}`);
    }
    return parts.join('\n');
  };

  const [documentOptions, setDocumentOptions] = useState({
    language: 'fr',
    showSignature: true,
    showConditions: true,
    showFreeField: false,
    showGlobalDiscount: false,
    conditionsText: '',
    freeFieldContent: '',
    showPaymentMethod: false,
    paymentMethodText: '',
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
          line_type: 'item',
        },
      ],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering lines
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    if (active.id === over.id) return;
    
    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      move(oldIndex, newIndex);
    }
  }, [fields, move]);

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
          discount_amount: Number((line as any).discount_amount) || 0,
          item_id: line.item_id || undefined,
          purchase_price: (line as any).purchase_price || null,
          line_type: ((line as any).line_type as 'item' | 'text' | 'section') || 'item',
        })),
      });
      // Initialiser les options avec les conditions existantes et le mode de paiement
      setDocumentOptions((prev) => ({
        ...prev,
        conditionsText: invoice.terms || '',
        paymentMethodText: invoice.payment_method_text || '',
        showPaymentMethod: !!invoice.payment_method_text,
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
            line_type: 'item',
          },
        ],
      });
      // Initialiser paymentMethodText avec les informations bancaires si disponibles
      const bankInfo = formatBankInfo();
      if (bankInfo) {
        setDocumentOptions((prev) => ({
          ...prev,
          paymentMethodText: bankInfo,
        }));
      }
    }
  }, [invoice, isEditing, open, form, defaultTaxRate, defaultBankAccount]);

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
        purchase_price: article.purchase_price || null,
        line_type: 'item',
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

  // Fonction pour compter les lignes par type avant l'index actuel
  const getLineTypeCount = useCallback((index: number, type: 'item' | 'text' | 'section') => {
    const lines = form.getValues('lines');
    let count = 0;
    for (let i = 0; i <= index; i++) {
      if ((lines[i]?.line_type || 'item') === type) {
        count++;
      }
    }
    return count;
  }, [form]);

  const handleSubmit = (values: InvoiceFormValues) => {
    const formData = {
      contact_id: values.contact_id === 'none' ? undefined : values.contact_id,
      subject: values.subject,
      purchase_order_number: values.purchase_order_number,
      date: format(values.date, 'yyyy-MM-dd'),
      due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
      notes: values.notes,
      terms: values.terms,
      payment_method_text: documentOptions.showPaymentMethod ? documentOptions.paymentMethodText || null : null,
      lines: values.lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        discount_percent: line.discount_percent,
        discount_amount: line.discount_amount,
        item_id: line.item_id && line.item_id.length > 0 ? line.item_id : null,
        line_type: line.line_type || 'item',
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
                          <Textarea 
                            placeholder="Ex: Développement site web" 
                            {...field} 
                            className="min-h-[60px] resize-y"
                            rows={2}
                          />
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

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis]}
                  >
                    <SortableContext
                      items={fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {fields.map((field, index) => {
                          const lineType = form.watch(`lines.${index}.line_type`) || 'item';
                          const typeCount = getLineTypeCount(index, lineType);
                          
                          return (
                            <SortableLineItem key={field.id} id={field.id} disabled={false}>
                              <QuoteInvoiceLineEditor
                                index={index}
                                canDelete={fields.length > 1}
                                onDelete={remove}
                                onDuplicate={handleDuplicate}
                                taxRates={taxRates}
                                defaultTaxRate={defaultTaxRate}
                                lineType={lineType}
                                typeCount={typeCount}
                              />
                            </SortableLineItem>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <div className="flex flex-wrap gap-2">
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
                          line_type: 'item',
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nouvelle ligne d'article
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          description: '',
                          quantity: 0,
                          unit_price: 0,
                          tax_rate: 0,
                          discount_percent: 0,
                          line_type: 'section',
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Section
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          description: '',
                          quantity: 0,
                          unit_price: 0,
                          tax_rate: 0,
                          discount_percent: 0,
                          line_type: 'text',
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Texte libre
                    </Button>
                  </div>
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
