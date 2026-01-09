import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type Quote = Tables<'quotes'>;
export type QuoteLine = Tables<'quote_lines'>;
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuoteWithLines extends Quote {
  quote_lines: QuoteLine[];
  contact?: Tables<'contacts'> | null;
}

export interface QuoteLineInput {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percent?: number;
  item_id?: string;
  position?: number;
}

export interface QuoteFormData {
  contact_id?: string;
  subject?: string;
  date: string;
  valid_until?: string;
  notes?: string;
  terms?: string;
  lines: QuoteLineInput[];
}

interface UseQuotesOptions {
  status?: QuoteStatus | 'all';
  search?: string;
}

export function useQuotes(options: UseQuotesOptions = {}) {
  const { status = 'all', search = '' } = options;

  return useQuery({
    queryKey: ['quotes', { status, search }],
    queryFn: async () => {
      let query = supabase
        .from('quotes')
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

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          contact:contacts(*),
          quote_lines(*)
        `)
        .eq('id', id)
        .order('position', { referencedTable: 'quote_lines', ascending: true })
        .single();

      if (error) throw error;
      return data as QuoteWithLines;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: QuoteFormData) => {
      // Get user's organization_id and next quote number
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Aucune organisation trouvée');
      }

      // Get the next quote number using the database function
      const { data: quoteNumber, error: numError } = await supabase
        .rpc('get_next_quote_number', { _org_id: profile.organization_id });

      if (numError) throw numError;

      // Calculate totals
      const { subtotal, taxAmount, total } = calculateTotals(data.lines);

      // Create the quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          organization_id: profile.organization_id,
          number: quoteNumber,
          contact_id: data.contact_id || null,
          subject: data.subject || null,
          date: data.date,
          valid_until: data.valid_until || null,
          notes: data.notes || null,
          terms: data.terms || null,
          subtotal,
          tax_amount: taxAmount,
          total,
          status: 'draft',
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote lines
      if (data.lines.length > 0) {
        const linesToInsert = data.lines.map((line, index) => ({
          quote_id: quote.id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent || 0,
          item_id: line.item_id || null,
          position: index,
          line_total: calculateLineTotal(line),
        }));

        console.log('Inserting quote lines:', linesToInsert);
        const { data: insertedLines, error: linesError } = await supabase
          .from('quote_lines')
          .insert(linesToInsert)
          .select();

        if (linesError) {
          console.error('Error inserting quote lines:', linesError);
          throw new Error(`Erreur lors de l'ajout des lignes: ${linesError.message}`);
        }
        console.log('Successfully inserted quote lines:', insertedLines);
      }

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: 'Devis créé',
        description: 'Le devis a été créé avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de créer le devis: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: QuoteFormData & { id: string }) => {
      // Calculate totals
      const { subtotal, taxAmount, total } = calculateTotals(data.lines);

      // Update the quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .update({
          contact_id: data.contact_id || null,
          subject: data.subject || null,
          date: data.date,
          valid_until: data.valid_until || null,
          notes: data.notes || null,
          terms: data.terms || null,
          subtotal,
          tax_amount: taxAmount,
          total,
        })
        .eq('id', id)
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Delete existing lines and recreate
      const { error: deleteError } = await supabase.from('quote_lines').delete().eq('quote_id', id);
      if (deleteError) {
        console.error('Error deleting existing quote lines:', deleteError);
      }

      if (data.lines.length > 0) {
        const linesToInsert = data.lines.map((line, index) => ({
          quote_id: id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          discount_percent: line.discount_percent || 0,
          item_id: line.item_id || null,
          position: index,
          line_total: calculateLineTotal(line),
        }));

        console.log('Updating quote lines:', linesToInsert);
        const { data: insertedLines, error: linesError } = await supabase
          .from('quote_lines')
          .insert(linesToInsert)
          .select();

        if (linesError) {
          console.error('Error inserting quote lines:', linesError);
          throw new Error(`Erreur lors de l'ajout des lignes: ${linesError.message}`);
        }
        console.log('Successfully updated quote lines:', insertedLines);
      }

      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: 'Devis modifié',
        description: 'Le devis a été mis à jour avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de modifier le devis: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      const statusLabels: Record<QuoteStatus, string> = {
        draft: 'brouillon',
        sent: 'envoyé',
        accepted: 'accepté',
        rejected: 'refusé',
        expired: 'expiré',
      };
      toast({
        title: 'Statut mis à jour',
        description: `Le devis est maintenant ${statusLabels[status]}.`,
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

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete lines first (should cascade, but just in case)
      await supabase.from('quote_lines').delete().eq('quote_id', id);
      
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: 'Devis supprimé',
        description: 'Le devis a été supprimé avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de supprimer le devis: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Helper functions
function calculateLineTotal(line: QuoteLineInput): number {
  const subtotal = line.quantity * line.unit_price;
  const discount = subtotal * (line.discount_percent || 0) / 100;
  return subtotal - discount;
}

function calculateTotals(lines: QuoteLineInput[]) {
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

export { calculateLineTotal, calculateTotals };
