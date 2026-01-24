import { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableLineItem } from '@/components/shared/SortableLineItem';
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
import { useQuote, useCreateQuote, useUpdateQuote, calculateTotals, calculateMargins, type QuoteLineWithCost } from '@/hooks/useQuotes';
import { useClients } from '@/hooks/useClients';
import { useArticles, useTaxRates } from '@/hooks/useArticles';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { Loader2, Plus, Trash2, CalendarIcon, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArticlePicker } from '@/components/shared/ArticlePicker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const lineTypeSchema = z.enum(['item', 'text', 'section']).default('item');

const lineSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.coerce.number().min(0),
  unit_price: z.coerce.number().min(0),
  tax_rate: z.coerce.number().min(0),
  discount_percent: z.coerce.number().min(0).max(100).optional(),
  item_id: z.string().optional(),
  purchase_price: z.coerce.number().optional().nullable(),
  line_type: lineTypeSchema,
}).refine(
  (data) => {
    // For item lines, quantity must be > 0
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
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const { canViewMargins } = useCurrentUserPermissions();

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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);
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
        purchase_price: article.purchase_price ?? null,
        line_type: 'item' as const,
      });
    }
  };

  const handleSubmit = (values: QuoteFormValues) => {
    // Filter lines - text/section lines just need description, item lines need quantity
    const validLines = values.lines.filter(
      line => {
        if (line.line_type === 'text' || line.line_type === 'section') {
          return line.description.trim().length > 0;
        }
        return line.description.trim().length > 0 && line.quantity > 0;
      }
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
        // Only include item_id if it's a valid UUID, otherwise set to null
        item_id: line.item_id && line.item_id.length > 0 ? line.item_id : null,
      })),
    };

    console.log('Submitting quote with data:', formData);

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
  // Only include item-type lines for calculations
  const linesForCalc: QuoteLineWithCost[] = watchedLines
    ?.filter(l => l.line_type === 'item' || !l.line_type)
    .map(l => ({
      description: l.description || '',
      quantity: l.quantity || 0,
      unit_price: l.unit_price || 0,
      tax_rate: l.tax_rate || 0,
      discount_percent: l.discount_percent,
      purchase_price: l.purchase_price ?? null,
    })) || [];
  const totals = calculateTotals(linesForCalc);
  const margins = canViewMargins ? calculateMargins(linesForCalc) : null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const isLoading = createQuote.isPending || updateQuote.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 w-[95vw] sm:w-full flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? 'Modifier le devis' : 'Nouveau devis'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingQuote && isEditing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6">
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-medium">Lignes du devis</h3>
                      <ArticlePicker 
                        articles={articles} 
                        onSelect={handleAddArticle}
                        buttonLabel="Ajouter un article"
                      />
                    </div>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                      modifiers={[restrictToVerticalAxis]}
                    >
                      <SortableContext
                        items={fields.map(f => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {fields.map((field, index) => (
                            <SortableLineItem key={field.id} id={field.id} disabled={fields.length <= 1}>
                              {(() => {
                                const lineType = form.watch(`lines.${index}.line_type`);
                                const isTextOrSection = lineType === 'text' || lineType === 'section';
                                
                                return (
                                  <div className={`p-3 border rounded-lg space-y-3 sm:space-y-0 sm:grid sm:gap-2 sm:items-start ${
                                    lineType === 'section' 
                                      ? 'bg-primary/5 border-primary/20 sm:grid-cols-12' 
                                      : lineType === 'text' 
                                        ? 'bg-muted/50 sm:grid-cols-12' 
                                        : 'bg-muted/30 sm:grid-cols-12'
                                  }`}>
                                    <div className={isTextOrSection ? 'sm:col-span-10' : 'sm:col-span-5'}>
                                      <FormField
                                        control={form.control}
                                        name={`lines.${index}.description`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormControl>
                                              <Input 
                                                placeholder={
                                                  lineType === 'section' 
                                                    ? 'Titre de section...' 
                                                    : lineType === 'text' 
                                                      ? 'Texte libre...' 
                                                      : 'Description'
                                                } 
                                                className={lineType === 'section' ? 'font-semibold' : ''}
                                                {...field} 
                                              />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                    
                                    {!isTextOrSection && (
                                      <>
                                        <div className="grid grid-cols-2 gap-2 sm:contents">
                                          <div className="sm:col-span-2">
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
                                          <div className="sm:col-span-2">
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
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 sm:contents">
                                          <div className="sm:col-span-1">
                                            <FormField
                                              control={form.control}
                                              name={`lines.${index}.discount_percent`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <div className="relative">
                                                      <Input
                                                        type="number"
                                                        step="1"
                                                        min="0"
                                                        max="100"
                                                        placeholder="Remise"
                                                        className="pr-6"
                                                        {...field}
                                                        value={field.value || ''}
                                                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                                                      />
                                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                                    </div>
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          </div>
                                          <div className="sm:col-span-1">
                                            <FormField
                                              control={form.control}
                                              name={`lines.${index}.tax_rate`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <Select
                                                    onValueChange={(val) => field.onChange(Number(val.replace('rate-', '')))}
                                                    value={field.value !== undefined && field.value !== null ? `rate-${field.value}` : `rate-${defaultTaxRate}`}
                                                  >
                                                    <FormControl>
                                                      <SelectTrigger>
                                                        <SelectValue placeholder="TVA" />
                                                      </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                      {taxRates?.filter(rate => rate.rate !== undefined && rate.rate !== null).map((rate) => (
                                                        <SelectItem key={rate.id} value={`rate-${rate.rate}`}>
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
                                          <div className="flex justify-end sm:col-span-1">
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
                                      </>
                                    )}
                                    
                                    {isTextOrSection && (
                                      <div className="sm:col-span-2 flex justify-end">
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
                                    )}
                                  </div>
                                );
                              })()}
                            </SortableLineItem>
                        ))}
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
                        Article
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

                  {/* Totals */}
                  <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total HT</span>
                      <span>{formatPrice(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">TVA</span>
                      <span>{formatPrice(totals.taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base sm:text-lg">
                      <span>Total TTC</span>
                      <span>{formatPrice(totals.total)}</span>
                    </div>
                    
                    {/* Margin display for admins */}
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
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:p-6 pt-4 border-t">
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
        )}
      </DialogContent>
    </Dialog>
  );
};
