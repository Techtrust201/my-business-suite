import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type Invoice = Tables<'invoices'>;
export type InvoiceLine = Tables<'invoice_lines'>;
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'viewed';

export interface InvoiceWithLines extends Invoice {
  invoice_lines: InvoiceLine[];
  contact?: Tables<'contacts'> | null;
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent?: number;
  item_id?: string;
  position?: number;
}

export interface InvoiceFormData {
  contact_id?: string;
  subject?: string;
  purchase_order_number?: string;
  date: string;
  due_date?: string;
  notes?: string;
  terms?: string;
  lines: InvoiceLineInput[];
}

interface UseInvoicesOptions {
  status?: InvoiceStatus | 'all';
  search?: string;
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  const { status = 'all', search = '' } = options;

  return useQuery({
    queryKey: ['invoices', { status, search }],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          contact:contacts(id, company_name, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`number.ilike.%${search}%,subject.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          contact:contacts(*),
          invoice_lines(*)
        `)
        .eq('id', id)
        .order('position', { referencedTable: 'invoice_lines', ascending: true })
        .single();

      if (error) throw error;
      return data as InvoiceWithLines;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      // Get user's organization_id and next invoice number
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Aucune organisation trouvée');
      }

      // Get the next invoice number using the database function
      const { data: invoiceNumber, error: numError } = await supabase
        .rpc('get_next_invoice_number', { _org_id: profile.organization_id });

      if (numError) throw numError;

      // Calculate totals
      const { subtotal, taxAmount, total } = calculateTotals(data.lines);

      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          organization_id: profile.organization_id,
          number: invoiceNumber,
          contact_id: data.contact_id || null,
          subject: data.subject || null,
          purchase_order_number: data.purchase_order_number || null,
          date: data.date,
          due_date: data.due_date || null,
          notes: data.notes || null,
          terms: data.terms || null,
          subtotal,
          tax_amount: taxAmount,
          total,
          status: 'draft',
          amount_paid: 0,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice lines
      if (data.lines.length > 0) {
        const linesToInsert = data.lines.map((line, index) => ({
          invoice_id: invoice.id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent || 0,
          item_id: line.item_id || null,
          position: index,
          line_total: calculateLineTotal(line),
        }));

        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(linesToInsert);

        if (linesError) throw linesError;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Facture créée',
        description: 'La facture a été créée avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de créer la facture: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: InvoiceFormData & { id: string }) => {
      // Calculate totals
      const { subtotal, taxAmount, total } = calculateTotals(data.lines);

      // Update the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .update({
          contact_id: data.contact_id || null,
          subject: data.subject || null,
          purchase_order_number: data.purchase_order_number || null,
          date: data.date,
          due_date: data.due_date || null,
          notes: data.notes || null,
          terms: data.terms || null,
          subtotal,
          tax_amount: taxAmount,
          total,
        })
        .eq('id', id)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Delete existing lines and recreate
      await supabase.from('invoice_lines').delete().eq('invoice_id', id);

      if (data.lines.length > 0) {
        const linesToInsert = data.lines.map((line, index) => ({
          invoice_id: id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent || 0,
          item_id: line.item_id || null,
          position: index,
          line_total: calculateLineTotal(line),
        }));

        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(linesToInsert);

        if (linesError) throw linesError;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Facture modifiée',
        description: 'La facture a été mise à jour avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de modifier la facture: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const statusLabels: Record<InvoiceStatus, string> = {
        draft: 'brouillon',
        sent: 'envoyée',
        paid: 'payée',
        partial: 'partiellement payée',
        overdue: 'en retard',
        cancelled: 'annulée',
      };
      toast({
        title: 'Statut mis à jour',
        description: `La facture est maintenant ${statusLabels[status]}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de changer le statut: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      // Get current invoice
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('total, amount_paid')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newAmountPaid = Number(invoice.amount_paid || 0) + amount;
      const total = Number(invoice.total);
      
      // Determine new status
      let newStatus: InvoiceStatus;
      if (newAmountPaid >= total) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partially_paid';
      } else {
        newStatus = 'sent';
      }

      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Paiement enregistré',
        description: 'Le paiement a été enregistré avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible d'enregistrer le paiement: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete lines first
      await supabase.from('invoice_lines').delete().eq('invoice_id', id);
      
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Facture supprimée',
        description: 'La facture a été supprimée avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de supprimer la facture: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useCreateInvoiceFromQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      // Fetch the quote with lines
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_lines(*)
        `)
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      // Get user's organization_id and next invoice number
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Aucune organisation trouvée');
      }

      // Get the next invoice number
      const { data: invoiceNumber, error: numError } = await supabase
        .rpc('get_next_invoice_number', { _org_id: profile.organization_id });

      if (numError) throw numError;

      // Get organization for payment terms
      const { data: org } = await supabase
        .from('organizations')
        .select('default_payment_terms')
        .eq('id', profile.organization_id)
        .single();

      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + (org?.default_payment_terms || 30));

      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          organization_id: profile.organization_id,
          number: invoiceNumber,
          contact_id: quote.contact_id,
          subject: quote.subject,
          date: today.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          notes: quote.notes,
          terms: quote.terms,
          subtotal: quote.subtotal,
          tax_amount: quote.tax_amount,
          total: quote.total,
          status: 'draft',
          amount_paid: 0,
          quote_id: quoteId,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice lines from quote lines
      if (quote.quote_lines?.length > 0) {
        const linesToInsert = quote.quote_lines.map((line: any, index: number) => ({
          invoice_id: invoice.id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent || 0,
          item_id: line.item_id || null,
          position: index,
          line_total: line.line_total,
        }));

        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(linesToInsert);

        if (linesError) throw linesError;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: 'Facture créée',
        description: 'La facture a été créée à partir du devis.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de créer la facture: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Helper functions
function calculateLineTotal(line: InvoiceLineInput): number {
  const subtotal = line.quantity * line.unit_price;
  const discount = subtotal * (line.discount_percent || 0) / 100;
  return subtotal - discount;
}

function calculateTotals(lines: InvoiceLineInput[]) {
  let subtotal = 0;
  let taxAmount = 0;

  lines.forEach((line) => {
    const lineSubtotal = calculateLineTotal(line);
    subtotal += lineSubtotal;
    taxAmount += lineSubtotal * (line.tax_rate / 100);
  });

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
  };
}

// Calculate VAT summary by rate
export function calculateVatSummary(lines: InvoiceLine[]) {
  const vatByRate: Record<number, { base: number; vat: number }> = {};

  lines.forEach((line) => {
    const rate = Number(line.tax_rate);
    const lineTotal = Number(line.line_total);
    const vatAmount = lineTotal * (rate / 100);

    if (!vatByRate[rate]) {
      vatByRate[rate] = { base: 0, vat: 0 };
    }
    vatByRate[rate].base += lineTotal;
    vatByRate[rate].vat += vatAmount;
  });

  return Object.entries(vatByRate)
    .map(([rate, values]) => ({
      rate: Number(rate),
      base: Math.round(values.base * 100) / 100,
      vat: Math.round(values.vat * 100) / 100,
    }))
    .sort((a, b) => b.rate - a.rate);
}

export { calculateLineTotal, calculateTotals };
