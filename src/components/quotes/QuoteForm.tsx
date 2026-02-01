import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useQuote,
  useCreateQuote,
  useUpdateQuote,
  calculateTotals,
  calculateMargins,
  type QuoteLineWithCost,
} from '@/hooks/useQuotes';
import { useClients, useClient } from '@/hooks/useClients';
import { useArticles, useTaxRates } from '@/hooks/useArticles';
import { useOrganization } from '@/hooks/useOrganization';
import { useDefaultBankAccount } from '@/hooks/useBankAccounts';
import { QuoteFormTopbar } from './QuoteFormTopbar';
import { QuoteFormTabDetails } from './QuoteFormTabDetails';
import { QuoteFormTabLines } from './QuoteFormTabLines';
import { QuoteFormTabOptions } from './QuoteFormTabOptions';
import { QuotePreview } from './QuotePreview';

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
  const formRef = useRef<HTMLFormElement>(null);

  // Data hooks
  const { data: quote, isLoading: isLoadingQuote } = useQuote(quoteId ?? undefined);
  const { data: clients } = useClients({ type: 'client' });
  const { articles } = useArticles();
  const { data: taxRates } = useTaxRates();
  const { organization } = useOrganization();
  const { data: defaultBankAccount } = useDefaultBankAccount();
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();

  // Format bank info helper
  const formatBankInfo = useCallback((): string => {
    if (!defaultBankAccount) return '';
    const parts: string[] = [];
    if (defaultBankAccount.iban) parts.push(`IBAN: ${defaultBankAccount.iban}`);
    if (defaultBankAccount.bic) parts.push(`BIC: ${defaultBankAccount.bic}`);
    if (defaultBankAccount.account_holder) parts.push(`Titulaire: ${defaultBankAccount.account_holder}`);
    if (defaultBankAccount.bank_name) parts.push(`Banque: ${defaultBankAccount.bank_name}`);
    return parts.join('\n');
  }, [defaultBankAccount]);

  // Document options state
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
    documentTitle: undefined as string | undefined,
    showDeliveryAddress: false,
    showSirenSiret: false,
    showVatNumber: false,
  });

  const defaultTaxRate = taxRates?.find((t) => t.is_default)?.rate || 20;

  // Form setup
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

  // Sync terms with options
  const termsValue = form.watch('terms');
  useEffect(() => {
    if (termsValue !== undefined && documentOptions.conditionsText !== termsValue) {
      setDocumentOptions((prev) => ({ ...prev, conditionsText: termsValue }));
    }
  }, [termsValue, documentOptions.conditionsText]);

  // Watch for preview
  const watchedFormData = form.watch();
  const watchedContactId = form.watch('contact_id');
  const { data: selectedClient } = useClient(watchedContactId || undefined);
  const watchedLines = form.watch('lines');

  // Calculate totals and margins
  const linesForCalc: QuoteLineWithCost[] = useMemo(() => 
    watchedLines?.map((l) => ({
      description: l.description || '',
      quantity: l.quantity || 0,
      unit_price: l.unit_price || 0,
      tax_rate: l.tax_rate || 0,
      discount_percent: l.discount_percent,
      purchase_price: l.purchase_price ?? null,
      line_type: l.line_type,
    })) || []
  , [watchedLines]);

  const totals = useMemo(() => 
    calculateTotals(
      linesForCalc,
      documentOptions.globalDiscountPercent || undefined,
      documentOptions.globalDiscountAmount || undefined
    )
  , [linesForCalc, documentOptions.globalDiscountPercent, documentOptions.globalDiscountAmount]);

  const margins = useMemo(() => calculateMargins(linesForCalc), [linesForCalc]);

  // Load existing quote data
  useEffect(() => {
    if (quote && isEditing) {
      form.reset({
        contact_id: quote.contact_id || undefined,
        subject: quote.subject || '',
        date: new Date(quote.date),
        valid_until: quote.valid_until ? new Date(quote.valid_until) : undefined,
        notes: quote.notes || '',
        terms: quote.terms || '',
        lines: quote.quote_lines.map((line: {
          description: string;
          quantity: number | string;
          unit_price: number | string;
          tax_rate: number | string;
          discount_percent?: number | string;
          item_id?: string;
          purchase_price?: number | null;
          line_type?: string;
        }) => ({
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
      setDocumentOptions((prev) => ({
        ...prev,
        conditionsText: quote.terms || '',
        paymentMethodText: quote.payment_method_text || '',
        showPaymentMethod: !!quote.payment_method_text,
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
      const bankInfo = formatBankInfo();
      if (bankInfo) {
        setDocumentOptions((prev) => ({ ...prev, paymentMethodText: bankInfo }));
      }
    }
  }, [quote, isEditing, open, form, defaultTaxRate, formatBankInfo]);

  // Handle add article
  const handleAddArticle = (articleId: string) => {
    const article = articles?.find((a) => a.id === articleId);
    if (article) {
      const taxRate = taxRates?.find((t) => t.id === article.tax_rate_id)?.rate || defaultTaxRate;
      const currentLines = form.getValues('lines');
      form.setValue('lines', [
        ...currentLines,
        {
          description: article.name + (article.description ? ` - ${article.description}` : ''),
          quantity: 1,
          unit_price: article.unit_price,
          tax_rate: taxRate,
          discount_percent: 0,
          item_id: article.id,
          purchase_price: article.purchase_price ?? null,
          line_type: 'item' as const,
        },
      ]);
    }
  };

  // Handle submit
  const handleSubmit = (values: QuoteFormValues) => {
    const validLines = values.lines.filter(
      (line) => line.description.trim().length > 0 && (line.line_type !== 'item' || line.quantity > 0)
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
      payment_method_text: documentOptions.showPaymentMethod ? documentOptions.paymentMethodText || null : null,
      lines: validLines.map((line) => ({
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
      updateQuote.mutate({ id: quoteId, ...formData }, { onSuccess: () => onOpenChange(false) });
    } else {
      createQuote.mutate(formData, { onSuccess: () => onOpenChange(false) });
    }
  };

  const isLoading = createQuote.isPending || updateQuote.isPending;
  const itemLineCount = watchedLines?.filter((l) => l.line_type === 'item').length || 0;
  const subtitle = watchedFormData.subject ? `Brouillon — ${watchedFormData.subject}` : 'Brouillon';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <FormProvider {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
          {/* Topbar */}
          <QuoteFormTopbar
            title={isEditing ? 'Modifier le devis' : 'Nouveau devis'}
            subtitle={subtitle}
            isEditing={isEditing}
            isLoading={isLoading}
            onClose={() => onOpenChange(false)}
            onSubmit={() => formRef.current?.requestSubmit()}
          />

          {isLoadingQuote && isEditing ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex">
              {/* Left: Preview */}
              <div className="flex-[1.1] bg-muted/30 overflow-y-auto p-6 lg:p-8">
                <QuotePreview
                  formData={{
                    contact_id: watchedFormData.contact_id,
                    subject: watchedFormData.subject,
                    date: watchedFormData.date,
                    valid_until: watchedFormData.valid_until,
                    notes: watchedFormData.notes,
                    terms: watchedFormData.terms,
                    lines: (watchedLines || []).map((l) => ({
                      description: l.description || '',
                      quantity: l.quantity || 0,
                      unit_price: l.unit_price || 0,
                      tax_rate: l.tax_rate || 0,
                      discount_percent: l.discount_percent,
                      discount_amount: l.discount_amount,
                      item_id: l.item_id,
                      line_type: l.line_type,
                      purchase_price: l.purchase_price,
                    })),
                  }}
                  organization={organization}
                  client={selectedClient || null}
                  totals={totals}
                  quoteNumber={quote?.number}
                  options={documentOptions}
                />
              </div>

              {/* Right: Form with Tabs */}
              <div className="w-[30rem] flex-shrink-0 border-l flex flex-col bg-background">
                <Tabs defaultValue="details" className="flex flex-col h-full">
                  <TabsList className="shrink-0 w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                    <TabsTrigger
                      value="details"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
                    >
                      Détails
                    </TabsTrigger>
                    <TabsTrigger
                      value="lines"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
                    >
                      Lignes
                    </TabsTrigger>
                    <TabsTrigger
                      value="options"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm"
                    >
                      Options
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto">
                    <TabsContent value="details" className="p-5 m-0 h-full">
                      <QuoteFormTabDetails
                        clients={clients}
                        selectedClient={selectedClient || null}
                        total={totals.total}
                        lineCount={itemLineCount}
                        hasGlobalDiscount={documentOptions.showGlobalDiscount && (documentOptions.globalDiscountPercent > 0 || documentOptions.globalDiscountAmount > 0)}
                        margins={margins}
                      />
                    </TabsContent>

                    <TabsContent value="lines" className="p-5 m-0 h-full">
                      <QuoteFormTabLines
                        articles={articles}
                        taxRates={taxRates}
                        defaultTaxRate={defaultTaxRate}
                        onAddArticle={handleAddArticle}
                      />
                    </TabsContent>

                    <TabsContent value="options" className="p-5 m-0 h-full">
                      <QuoteFormTabOptions
                        options={documentOptions}
                        onOptionsChange={(newOptions) => {
                          setDocumentOptions({ ...documentOptions, ...newOptions });
                          if (newOptions.conditionsText !== undefined) {
                            form.setValue('terms', newOptions.conditionsText);
                          }
                        }}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          )}
        </form>
      </FormProvider>
    </div>
  );
};
