import { useEffect } from 'react';
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
import { useBill, useCreateBill, useUpdateBill, calculateTotals } from '@/hooks/useBills';
import { useClients } from '@/hooks/useClients';
import { useTaxRates } from '@/hooks/useArticles';
import { Loader2, Plus, Trash2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const lineSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.coerce.number().min(0.01, 'Quantité requise'),
  unit_price: z.coerce.number().min(0, 'Prix requis'),
  tax_rate: z.coerce.number().min(0),
});

const billSchema = z.object({
  contact_id: z.string().optional(),
  subject: z.string().optional(),
  vendor_reference: z.string().optional(),
  date: z.date(),
  due_date: z.date().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'Au moins une ligne requise'),
});

type BillFormValues = z.infer<typeof billSchema>;

interface BillFormProps {
  billId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BillForm = ({ billId, open, onOpenChange }: BillFormProps) => {
  const isEditing = !!billId;
  const { data: bill, isLoading: isLoadingBill } = useBill(billId ?? undefined);
  const { data: suppliers } = useClients({ type: 'supplier' });
  const { data: taxRates } = useTaxRates();
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();

  const defaultTaxRate = taxRates?.find((t) => t.is_default)?.rate || 20;

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      contact_id: undefined,
      subject: '',
      vendor_reference: '',
      date: new Date(),
      due_date: undefined,
      notes: '',
      lines: [
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          tax_rate: defaultTaxRate,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  useEffect(() => {
    if (bill && isEditing) {
      form.reset({
        contact_id: bill.contact_id || undefined,
        subject: bill.subject || '',
        vendor_reference: bill.vendor_reference || '',
        date: new Date(bill.date),
        due_date: bill.due_date ? new Date(bill.due_date) : undefined,
        notes: bill.notes || '',
        lines: bill.bill_lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity),
          unit_price: Number(line.unit_price),
          tax_rate: Number(line.tax_rate) || 0,
        })),
      });
    } else if (!isEditing && open) {
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      
      form.reset({
        contact_id: undefined,
        subject: '',
        vendor_reference: '',
        date: new Date(),
        due_date: defaultDueDate,
        notes: '',
        lines: [
          {
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: defaultTaxRate,
          },
        ],
      });
    }
  }, [bill, isEditing, open, form, defaultTaxRate]);

  const handleSubmit = (values: BillFormValues) => {
    const formData = {
      contact_id: values.contact_id === 'none' ? undefined : values.contact_id,
      subject: values.subject,
      vendor_reference: values.vendor_reference,
      date: format(values.date, 'yyyy-MM-dd'),
      due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
      notes: values.notes,
      lines: values.lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
      })),
    };

    if (isEditing && billId) {
      updateBill.mutate(
        { id: billId, ...formData },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createBill.mutate(formData, { onSuccess: () => onOpenChange(false) });
    }
  };

  const watchedLines = form.watch('lines');
  const totals = calculateTotals(watchedLines?.map(l => ({
    description: l.description || '',
    quantity: l.quantity || 0,
    unit_price: l.unit_price || 0,
    tax_rate: l.tax_rate || 0,
  })) || []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const isLoading = createBill.isPending || updateBill.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 w-[95vw] sm:w-full">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? "Modifier l'achat" : 'Nouvel achat'}
          </DialogTitle>
        </DialogHeader>

        {isLoadingBill && isEditing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <ScrollArea className="h-[calc(95vh-160px)] sm:h-[calc(95vh-180px)] px-4 sm:px-6">
                <div className="space-y-6 pb-6">
                  {/* Header info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fournisseur</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || 'none'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un fournisseur" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Aucun fournisseur</SelectItem>
                              {suppliers?.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  {supplier.company_name || `${supplier.first_name} ${supplier.last_name}`}
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
                      name="vendor_reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N° Facture fournisseur</FormLabel>
                          <FormControl>
                            <Input placeholder="Référence du fournisseur" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sujet / Objet</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Achat de fournitures" {...field} />
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
                          <FormLabel>Date de la facture</FormLabel>
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          append({
                            description: '',
                            quantity: 1,
                            unit_price: 0,
                            tax_rate: defaultTaxRate,
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter une ligne
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="p-3 border rounded-lg bg-muted/30 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-start"
                        >
                          <div className="sm:col-span-5">
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
                            <div className="flex items-center justify-end sm:col-span-1">
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

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
                  </div>

                  <Separator />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes internes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notes visibles uniquement en interne..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>

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
                  {isEditing ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
