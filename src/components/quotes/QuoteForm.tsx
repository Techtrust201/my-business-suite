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
import { useQuote, useCreateQuote, useUpdateQuote, calculateTotals, calculateMargins, type QuoteLineWithCost } from '@/hooks/useQuotes';
import { useClients, useClient } from '@/hooks/useClients';
import { useArticles, useTaxRates } from '@/hooks/useArticles';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { useOrganization } from '@/hooks/useOrganization';
import { Loader2, Plus, X, CalendarIcon, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArticlePicker } from '@/components/shared/ArticlePicker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QuotePreview } from './QuotePreview';
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
  const { organization } = useOrganization();
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const { canViewMargins } = useCurrentUserPermissions();
  
  // Fonction pour formater les informations bancaires par défaut
  const formatBankInfo = (): string => {
    const parts: string[] = [];
    if (organization?.rib) {
      parts.push(`IBAN: ${organization.rib}`);
    }
    if (organization?.bic) {
      parts.push(`BIC: ${organization.bic}`);
    }
    if (organization?.bank_details) {
      parts.push(organization.bank_details);
    }
    return parts.join('\n');
  };

  const [documentOptions, setDocumentOptions] = useState({
    language: 'fr',
    showSignature: true,
    showConditions: true,
    showFreeField: false,
    showGlobalDiscount: false,
    globalDiscountPercent: 0,
    globalDiscountAmount: 0,
    conditionsText: '',
    freeFieldContent: '',
    showPaymentMethod: false,
    paymentMethodText: '',
  });

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
          purchase_price: null,
          line_type: 'item' as const,
        },
      ],
    },
  });

  // Synchroniser le champ terms du formulaire avec conditionsText dans les options
  const termsValue = form.watch('terms');
  useEffect(() => {
    if (termsValue !== undefined && documentOptions.conditionsText !== termsValue) {
      setDocumentOptions((prev) => ({ ...prev, conditionsText: termsValue }));
    }
  }, [termsValue]);

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  // Watch form data for preview
  const watchedFormData = form.watch();
  const watchedContactId = form.watch('contact_id');
  const { data: selectedClient } = useClient(watchedContactId || undefined);

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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Si l'élément est déposé en dehors d'une zone valide, ne rien faire
    if (!over) {
      return;
    }

    // Si l'élément est déposé sur lui-même, ne rien faire
    if (active.id === over.id) {
      return;
    }

    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);
    
    // Vérifier que les indices sont valides et différents
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      move(oldIndex, newIndex);
    }
  }, [fields, move]);

  useEffect(() => {
    if (quote && isEditing) {
      form.reset({
        contact_id: quote.contact_id || undefined,
        subject: quote.subject || '',
        date: new Date(quote.date),
        valid_until: quote.valid_until ? new Date(quote.valid_until) : undefined,
        notes: quote.notes || '',
        terms: quote.terms || '',
        lines: quote.quote_lines.map((line: any) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          tax_rate: Number(line.tax_rate),
          discount_percent: Number(line.discount_percent) || 0,
          item_id: line.item_id || undefined,
          purchase_price: line.purchase_price ?? null,
          line_type: (line.line_type as 'item' | 'text' | 'section') || 'item',
        })),
      });
      // Initialiser les options avec les conditions existantes
      setDocumentOptions((prev) => ({
        ...prev,
        conditionsText: quote.terms || '',
      }));
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
            purchase_price: null,
            line_type: 'item' as const,
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
  }, [quote, isEditing, open, form, defaultTaxRate, organization]);

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
        purchase_price: article.purchase_price ?? null,
        line_type: 'item' as const,
      });
    }
  };

  const handleDuplicate = useCallback((index: number) => {
    const line = fields[index];
    if (line) {
      const lineData = form.getValues(`lines.${index}`);
      append({
        ...lineData,
        description: `${lineData.description} (copie)`,
      });
    }
  }, [fields, form, append]);

  const handleSubmit = (values: QuoteFormValues) => {
    const validLines = values.lines.filter(
      line => line.description.trim().length > 0 && (line.line_type !== 'item' || line.quantity > 0)
    );

    if (validLines.length === 0) {
      form.setError('lines', {
        type: 'manual',
        message: 'Veuillez ajouter au moins une ligne valide avec une description.',
      });
      return;
    }

    const formData = {
      contact_id: values.contact_id === 'none' ? undefined : values.contact_id,
      subject: values.subject,
      date: format(values.date, 'yyyy-MM-dd'),
      valid_until: values.valid_until ? format(values.valid_until, 'yyyy-MM-dd') : undefined,
      notes: values.notes,
      terms: values.terms,
      lines: validLines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        discount_percent: line.discount_percent,
        item_id: line.item_id && line.item_id.length > 0 ? line.item_id : null,
        line_type: line.line_type,
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
  const linesForCalc: QuoteLineWithCost[] = watchedLines?.map(l => ({
    description: l.description || '',
    quantity: l.quantity || 0,
    unit_price: l.unit_price || 0,
    tax_rate: l.tax_rate || 0,
    discount_percent: l.discount_percent,
    purchase_price: l.purchase_price ?? null,
    line_type: l.line_type,
  })) || [];
  const totals = useMemo(() => 
    calculateTotals(
      linesForCalc, 
      documentOptions.globalDiscountPercent || undefined,
      documentOptions.globalDiscountAmount || undefined
    ), 
    [linesForCalc, documentOptions.globalDiscountPercent, documentOptions.globalDiscountAmount]
  );
  const margins = canViewMargins ? calculateMargins(linesForCalc) : null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const isLoading = createQuote.isPending || updateQuote.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header fixe en haut */}
      <div className="border-b p-4 flex justify-between items-center bg-background">
        <h1 className="text-xl font-semibold">
          {isEditing ? 'Modifier le devis' : 'Nouveau devis'}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {isLoadingQuote && isEditing ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Colonne gauche: Aperçu (60%) */}
          <div className="w-full lg:w-[60%] lg:border-r border-b lg:border-b-0 p-4 lg:p-6 overflow-y-auto bg-muted/20">
            <QuotePreview
              formData={{
                contact_id: watchedFormData.contact_id,
                subject: watchedFormData.subject,
                date: watchedFormData.date,
                valid_until: watchedFormData.valid_until,
                notes: watchedFormData.notes,
                terms: watchedFormData.terms,
                lines: watchedLines || [],
              }}
              organization={organization}
              client={selectedClient || null}
              totals={totals}
              quoteNumber={quote?.number}
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
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sujet</FormLabel>
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
                </div>

                <Separator />

                {/* Gestion des lignes */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base font-medium">Lignes du devis</h3>
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
                      items={fields.map(f => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {fields.map((field, index) => {
                          const line = form.watch(`lines.${index}`);
                          const lineType = line?.line_type || 'item';
                          
                          // Calculer le compteur par type
                          const getLineTypeCount = (idx: number, type: string) => {
                            const linesBefore = fields.slice(0, idx);
                            const sameTypeLines = linesBefore.filter(
                              (_, i) => {
                                const l = form.watch(`lines.${i}`);
                                return (l?.line_type || 'item') === type;
                              }
                            );
                            return sameTypeLines.length + 1;
                          };
                          
                          return (
                            <SortableLineItem 
                              key={field.id} 
                              id={field.id} 
                              disabled={false}
                            >
                              <QuoteInvoiceLineEditor
                                index={index}
                                canDelete={fields.length > 1}
                                onDelete={remove}
                                onDuplicate={handleDuplicate}
                                taxRates={taxRates}
                                defaultTaxRate={defaultTaxRate}
                                lineType={lineType}
                                typeCount={getLineTypeCount(index, lineType)}
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
                          purchase_price: null,
                          line_type: 'item' as const,
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nouvelle ligne d'article
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        append({
                          description: '',
                          quantity: 0,
                          unit_price: 0,
                          tax_rate: 0,
                          discount_percent: 0,
                          purchase_price: null,
                          line_type: 'text' as const,
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Texte libre
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        append({
                          description: '',
                          quantity: 0,
                          unit_price: 0,
                          tax_rate: 0,
                          discount_percent: 0,
                          purchase_price: null,
                          line_type: 'section' as const,
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Section
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

                  {canViewMargins && margins && (
                    <>
                      <Separator className="my-3" />
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          <span>Analyse de marge</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs text-xs">
                                  La marge est calculée sur les prix d'achat des articles.
                                  Les lignes sans prix d'achat ont une marge de 100%.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Coût d'achat total</span>
                          <span className="text-destructive">{formatPrice(margins.totalCost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Prix de vente HT</span>
                          <span>{formatPrice(margins.totalSale)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-muted-foreground">Marge brute</span>
                          <span className={cn(
                            margins.totalMargin >= 0 ? 'text-green-600' : 'text-destructive'
                          )}>
                            {formatPrice(margins.totalMargin)} ({margins.marginPercent}%)
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Options complémentaires */}
                <DocumentOptionsSidebar
                  type="quote"
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
                    {isEditing ? 'Enregistrer' : 'Créer le devis'}
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
