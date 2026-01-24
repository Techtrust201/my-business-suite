import { useEffect, useCallback } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useInvoice, useCreateInvoice, useUpdateInvoice, calculateTotals } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { useArticles, useTaxRates } from '@/hooks/useArticles';
import { useActiveBankAccounts } from '@/hooks/useBankAccounts';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { Loader2, Plus, Trash2, CalendarIcon, TrendingUp, Info, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArticlePicker } from '@/components/shared/ArticlePicker';

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
  bank_account_id: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Au moins une ligne requise'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoiceId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Margin calculation helper
function calculateMargins(lines: { quantity: number; unit_price: number; purchase_price?: number | null; discount_percent?: number }[]) {
  let totalCost = 0;
  let totalSale = 0;

  lines.forEach((line) => {
    const discountMultiplier = 1 - (line.discount_percent || 0) / 100;
    const lineTotal = line.quantity * line.unit_price * discountMultiplier;
    const lineCost = line.quantity * (line.purchase_price ?? 0);
    
    totalSale += lineTotal;
    totalCost += lineCost;
  });

  const totalMargin = totalSale - totalCost;
  const marginPercent = totalSale > 0 ? Math.round((totalMargin / totalSale) * 100) : 0;

  return { totalCost, totalSale, totalMargin, marginPercent };
}

export const InvoiceForm = ({ invoiceId, open, onOpenChange }: InvoiceFormProps) => {
  const isEditing = !!invoiceId;
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(invoiceId ?? undefined);
  const { data: clients } = useClients({ type: 'client' });
  const { articles } = useArticles();
  const { data: taxRates } = useTaxRates();
  const { data: bankAccounts } = useActiveBankAccounts();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { canViewMargins } = useCurrentUserPermissions();

  const defaultTaxRate = taxRates?.find((t) => t.is_default)?.rate || 20;
  const defaultBankAccount = bankAccounts?.find((b) => b.is_default);

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
      bank_account_id: undefined,
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
    if (invoice && isEditing) {
      form.reset({
        contact_id: invoice.contact_id || undefined,
        subject: invoice.subject || '',
        purchase_order_number: invoice.purchase_order_number || '',
        date: new Date(invoice.date),
        due_date: invoice.due_date ? new Date(invoice.due_date) : undefined,
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        bank_account_id: invoice.bank_account_id || undefined,
        lines: invoice.invoice_lines.map((line: any) => ({
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
      // Calculate default due date (30 days from now)
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
        bank_account_id: defaultBankAccount?.id,
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
  }, [invoice, isEditing, open, form, defaultTaxRate, defaultBankAccount?.id]);

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

  const handleSubmit = (values: InvoiceFormValues) => {
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
      purchase_order_number: values.purchase_order_number,
      date: format(values.date, 'yyyy-MM-dd'),
      due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
      notes: values.notes,
      terms: values.terms,
      bank_account_id: values.bank_account_id === 'none' ? undefined : values.bank_account_id,
      lines: validLines.map(line => ({
        description: line.description,
        quantity: line.line_type === 'item' ? line.quantity : 0,
        unit_price: line.line_type === 'item' ? line.unit_price : 0,
        tax_rate: line.line_type === 'item' ? line.tax_rate : 0,
        discount_percent: line.discount_percent,
        item_id: line.item_id && line.item_id.length > 0 ? line.item_id : null,
        line_type: line.line_type,
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
  // Only include item-type lines for calculations
  const linesForCalc = watchedLines
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

  const isLoading = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 w-[95vw] sm:w-full flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? 'Modifier la facture' : 'Nouvelle facture'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingInvoice && isEditing ? (
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <FormField
                      control={form.control}
                      name="bank_account_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Landmark className="h-4 w-4" />
                            Compte bancaire
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || 'none'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un compte" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Aucun compte</SelectItem>
                              {bankAccounts?.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} {account.is_default ? '(défaut)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

                  <Separator />

                  {/* Lines */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-base sm:text-lg font-medium">Lignes de facture</h3>
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
                          {fields.map((field, index) => {
                            const lineType = form.watch(`lines.${index}.line_type`);
                            const isTextOrSection = lineType === 'text' || lineType === 'section';
                            
                            return (
                              <SortableLineItem key={field.id} id={field.id} disabled={fields.length <= 1}>
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
                                      <div className="grid grid-cols-2 gap-2 sm:contents">
                                        <div className="sm:col-span-2">
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
                  {isEditing ? 'Enregistrer' : 'Créer la facture'}
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
