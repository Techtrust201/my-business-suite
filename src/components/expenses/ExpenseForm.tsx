import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Receipt, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ReceiptScanner } from './ReceiptScanner';
import { 
  useCreateExpense, 
  useUpdateExpense, 
  Expense, 
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  PaymentMethod,
} from '@/hooks/useExpenses';
import { ParsedReceiptData } from '@/lib/ocrParser';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'card', label: 'Carte bancaire' },
  { value: 'cash', label: 'Espèces' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'check', label: 'Chèque' },
  { value: 'other', label: 'Autre' },
];

const formSchema = z.object({
  date: z.date({ required_error: 'La date est requise' }),
  amount: z.coerce.number().positive('Le montant doit être positif'),
  description: z.string().optional(),
  category: z.string(),
  vendor_name: z.string().optional(),
  payment_method: z.string(),
  notes: z.string().optional(),
  is_reimbursable: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expense?: Expense | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isLoading = createExpense.isPending || updateExpense.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: expense ? new Date(expense.date) : new Date(),
      amount: expense?.amount || 0,
      description: expense?.description || '',
      category: expense?.category || 'autre',
      vendor_name: expense?.vendor_name || '',
      payment_method: expense?.payment_method || 'card',
      notes: expense?.notes || '',
      is_reimbursable: expense?.is_reimbursable || false,
    },
  });

  // Reset form when expense changes
  useEffect(() => {
    if (expense) {
      form.reset({
        date: new Date(expense.date),
        amount: expense.amount,
        description: expense.description || '',
        category: expense.category,
        vendor_name: expense.vendor_name || '',
        payment_method: expense.payment_method,
        notes: expense.notes || '',
        is_reimbursable: expense.is_reimbursable,
      });
    }
  }, [expense, form]);

  const handleOcrData = (data: ParsedReceiptData, file: File) => {
    // Pre-fill form with extracted data
    if (data.amount) {
      form.setValue('amount', data.amount);
    }
    if (data.date) {
      form.setValue('date', new Date(data.date));
    }
    if (data.vendor) {
      form.setValue('vendor_name', data.vendor);
    }
    
    setReceiptFile(file);
    setShowScanner(false);
  };

  const onSubmit = async (values: FormValues) => {
    const formData = {
      date: format(values.date, 'yyyy-MM-dd'),
      amount: values.amount,
      description: values.description,
      category: values.category as ExpenseCategory,
      vendor_name: values.vendor_name,
      payment_method: values.payment_method as PaymentMethod,
      notes: values.notes,
      is_reimbursable: values.is_reimbursable,
      receipt_file: receiptFile || undefined,
    };

    if (expense) {
      await updateExpense.mutateAsync({
        id: expense.id,
        data: formData,
        oldReceiptUrl: expense.receipt_url || undefined,
      });
    } else {
      await createExpense.mutateAsync(formData);
    }

    onSuccess?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* OCR Scanner Section */}
        {!expense && (
          <Collapsible open={showScanner} onOpenChange={setShowScanner}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full">
                <Receipt className="h-4 w-4 mr-2" />
                {showScanner ? 'Masquer le scanner' : 'Scanner un ticket (OCR)'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <ReceiptScanner
                onDataExtracted={handleOcrData}
                onFileSelected={(file) => setReceiptFile(file)}
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Receipt preview if file selected but scanner closed */}
        {receiptFile && !showScanner && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1 truncate">{receiptFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReceiptFile(null)}
            >
              Supprimer
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: fr })
                        ) : (
                          <span>Sélectionner une date</span>
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
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant (€) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="Description de la dépense..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catégorie</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', cat.color)} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Vendor */}
          <FormField
            control={form.control}
            name="vendor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commerce</FormLabel>
                <FormControl>
                  <Input placeholder="Nom du commerce..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Payment method */}
        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mode de paiement</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notes additionnelles..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reimbursable */}
        <FormField
          control={form.control}
          name="is_reimbursable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Frais remboursable</FormLabel>
                <FormDescription>
                  Cochez si cette dépense doit être remboursée
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {expense ? 'Mettre à jour' : 'Créer la dépense'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
