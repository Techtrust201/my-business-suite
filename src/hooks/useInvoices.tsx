import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { 
  generateInvoiceEntry, 
  generatePaymentReceivedEntry,
  deleteEntriesByReference 
} from '@/hooks/useAccountingEntries';

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
  discount_amount?: number;
  item_id?: string;
  position?: number;
  line_type?: 'item' | 'text' | 'section';
}

export interface InvoiceFormData {
  contact_id?: string;
  subject?: string;
  purchase_order_number?: string;
  date: string;
  due_date?: string;
  notes?: string;
  terms?: string;
  payment_method_text?: string | null;
  lines: InvoiceLineInput[];
}

interface UseInvoicesOptions {
  status?: InvoiceStatus | 'all';
  search?: string;
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  const { status = 'all', search = '' } = options;
  const queryClient = useQueryClient();

  // Realtime subscription for invoices
  useEffect(() => {
    const channel = supabase
      .channel('invoices-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
          queryClient.invalidateQueries({ queryKey: ['revenue-chart'] });
          queryClient.invalidateQueries({ queryKey: ['unpaid-invoices-chart'] });
          queryClient.invalidateQueries({ queryKey: ['invoice-status-chart'] });
          queryClient.invalidateQueries({ queryKey: ['top-clients'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
          payment_method_text: data.payment_method_text || null,
          subtotal,
          tax_amount: taxAmount,
          total,
          status: 'draft',
          amount_paid: 0,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice lines with purchase prices from articles
      if (data.lines.length > 0) {
        // Fetch purchase prices for all articles in one query
        const itemIds = data.lines
          .filter(line => line.item_id)
          .map(line => line.item_id as string);
        
        let articlePrices: Record<string, number | null> = {};
        if (itemIds.length > 0) {
          const { data: articles } = await supabase
            .from('articles')
            .select('id, purchase_price')
            .in('id', itemIds);
          
          if (articles) {
            articlePrices = articles.reduce((acc, article) => {
              acc[article.id] = article.purchase_price;
              return acc;
            }, {} as Record<string, number | null>);
          }
        }

        const linesToInsert = data.lines.map((line, index) => ({
          invoice_id: invoice.id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent || 0,
          discount_amount: line.discount_amount || 0,
          item_id: line.item_id || null,
          position: index,
          line_total: calculateLineTotal(line),
          purchase_price: line.item_id ? articlePrices[line.item_id] || null : null,
          line_type: line.line_type || 'item',
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
          payment_method_text: data.payment_method_text || null,
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
        // Fetch purchase prices for all articles in one query
        const itemIds = data.lines
          .filter(line => line.item_id)
          .map(line => line.item_id as string);
        
        let articlePrices: Record<string, number | null> = {};
        if (itemIds.length > 0) {
          const { data: articles } = await supabase
            .from('articles')
            .select('id, purchase_price')
            .in('id', itemIds);
          
          if (articles) {
            articlePrices = articles.reduce((acc, article) => {
              acc[article.id] = article.purchase_price;
              return acc;
            }, {} as Record<string, number | null>);
          }
        }

        const linesToInsert = data.lines.map((line, index) => ({
          invoice_id: id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent || 0,
          discount_amount: line.discount_amount || 0,
          item_id: line.item_id || null,
          position: index,
          line_total: calculateLineTotal(line),
          purchase_price: line.item_id ? articlePrices[line.item_id] || null : null,
          line_type: line.line_type || 'item',
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
      // Get invoice details for accounting entry
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          contact:contacts(company_name, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          status,
          sent_at: status === 'sent' ? new Date().toISOString() : invoice.sent_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Generate accounting entry when invoice is sent (not in draft anymore)
      if (status === 'sent' && invoice.status === 'draft') {
        const clientName = invoice.contact?.company_name || 
          `${invoice.contact?.first_name || ''} ${invoice.contact?.last_name || ''}`.trim() ||
          undefined;

        await generateInvoiceEntry(
          invoice.organization_id,
          invoice.id,
          invoice.number,
          invoice.date,
          Number(invoice.subtotal || 0),
          Number(invoice.tax_amount || 0),
          Number(invoice.total || 0),
          clientName
        );
      }

      // Delete accounting entries if invoice is cancelled
      if (status === 'cancelled') {
        await deleteEntriesByReference('invoice', id);
      }

      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-kpis'] });
      const statusLabels: Record<InvoiceStatus, string> = {
        draft: 'brouillon',
        sent: 'envoyée',
        viewed: 'consultée',
        paid: 'payée',
        partially_paid: 'partiellement payée',
        overdue: 'en retard',
        cancelled: 'annulée',
      };
      toast({
        title: 'Statut mis à jour',
        description: `La facture est maintenant ${statusLabels[status]}.${status === 'sent' ? ' Écriture comptable créée.' : ''}`,
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
    mutationFn: async ({ id, amount, method = 'bank_transfer' }: { id: string; amount: number; method?: string }) => {
      // Get current invoice with organization and contact info
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          contact:contacts(company_name, first_name, last_name)
        `)
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

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          organization_id: invoice.organization_id,
          invoice_id: id,
          amount,
          date: new Date().toISOString().split('T')[0],
          method: method as 'bank_transfer' | 'card' | 'cash' | 'check' | 'other',
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update invoice
      const { data, error } = await supabase
        .from('invoices')
        .update({ 
          amount_paid: newAmountPaid,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Generate accounting entry for payment
      const clientName = invoice.contact?.company_name || 
        `${invoice.contact?.first_name || ''} ${invoice.contact?.last_name || ''}`.trim() ||
        undefined;

      await generatePaymentReceivedEntry(
        invoice.organization_id,
        payment.id,
        invoice.number,
        new Date().toISOString().split('T')[0],
        amount,
        clientName
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-kpis'] });
      toast({
        title: 'Paiement enregistré',
        description: 'Le paiement et l\'écriture comptable ont été créés.',
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

export function useCancelInvoicePayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          amount_paid: 0,
          status: 'sent' as InvoiceStatus,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['linked-invoice-ids'] });
      toast({
        title: 'Paiement annulé',
        description: 'Le paiement a été annulé. La facture est de nouveau en attente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible d'annuler le paiement: ${error.message}`,
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
      // Delete accounting entries first (cascade)
      await deleteEntriesByReference('invoice', id);
      await deleteEntriesByReference('payment', id);
      
      // Delete payments
      await supabase.from('payments').delete().eq('invoice_id', id);
      
      // Delete lines
      await supabase.from('invoice_lines').delete().eq('invoice_id', id);
      
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-kpis'] });
      toast({
        title: 'Facture supprimée',
        description: 'La facture et ses écritures comptables ont été supprimées.',
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

      // Check if the quote has lines
      if (!quote.quote_lines || quote.quote_lines.length === 0) {
        throw new Error('Ce devis ne contient aucune ligne. Veuillez d\'abord ajouter des lignes au devis.');
      }

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

      console.log('Inserting invoice lines from quote:', linesToInsert);
      const { data: insertedLines, error: linesError } = await supabase
        .from('invoice_lines')
        .insert(linesToInsert)
        .select();

      if (linesError) {
        console.error('Error inserting invoice lines:', linesError);
        throw new Error(`Erreur lors de l'ajout des lignes: ${linesError.message}`);
      }
      console.log('Successfully inserted invoice lines:', insertedLines);

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
  // Les lignes text et section n'ont pas de total
  if (line.line_type === 'text' || line.line_type === 'section') {
    return 0;
  }
  
  const subtotal = line.quantity * line.unit_price;
  
  // Priorité au montant en € si défini, sinon utiliser le pourcentage
  let discount = 0;
  if (line.discount_amount && line.discount_amount > 0) {
    discount = line.discount_amount;
  } else if (line.discount_percent && line.discount_percent > 0) {
    discount = subtotal * (line.discount_percent / 100);
  }
  
  return subtotal - discount;
}

function calculateTotals(lines: InvoiceLineInput[]) {
  let subtotal = 0;
  let taxAmount = 0;

  // Filtrer uniquement les lignes de type 'item' (ou sans type pour compatibilité)
  const itemLines = lines.filter(line => !line.line_type || line.line_type === 'item');
  
  itemLines.forEach((line) => {
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

  // Filtrer uniquement les lignes de type 'item' (ou sans type pour compatibilité)
  const itemLines = lines.filter(line => !(line as any).line_type || (line as any).line_type === 'item');
  
  itemLines.forEach((line) => {
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
