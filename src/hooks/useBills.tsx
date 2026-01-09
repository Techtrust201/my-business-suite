import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type Bill = Tables<'bills'>;
export type BillLine = Tables<'bill_lines'>;
export type BillStatus = 'draft' | 'received' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface BillWithLines extends Bill {
  bill_lines: BillLine[];
  contact?: Tables<'contacts'> | null;
}

export interface BillLineInput {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  item_id?: string;
  position?: number;
}

export interface BillFormData {
  contact_id?: string;
  subject?: string;
  vendor_reference?: string;
  date: string;
  due_date?: string;
  notes?: string;
  lines: BillLineInput[];
}

interface UseBillsOptions {
  status?: BillStatus | 'all';
  search?: string;
}

export function useBills(options: UseBillsOptions = {}) {
  const { status = 'all', search = '' } = options;

  return useQuery({
    queryKey: ['bills', { status, search }],
    queryFn: async () => {
      let query = supabase
        .from('bills')
        .select(`
          *,
          contact:contacts(id, company_name, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`number.ilike.%${search}%,subject.ilike.%${search}%,vendor_reference.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useBill(id: string | undefined) {
  return useQuery({
    queryKey: ['bills', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          contact:contacts(*),
          bill_lines(*)
        `)
        .eq('id', id)
        .order('position', { referencedTable: 'bill_lines', ascending: true })
        .single();

      if (error) throw error;
      return data as BillWithLines;
    },
    enabled: !!id,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: BillFormData) => {
      // Get user's organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Aucune organisation trouvée');
      }

      // Calculate totals
      const { subtotal, taxAmount, total } = calculateTotals(data.lines);

      // Create the bill
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({
          organization_id: profile.organization_id,
          contact_id: data.contact_id || null,
          subject: data.subject || null,
          vendor_reference: data.vendor_reference || null,
          date: data.date,
          due_date: data.due_date || null,
          notes: data.notes || null,
          subtotal,
          tax_amount: taxAmount,
          total,
          status: 'received',
          amount_paid: 0,
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create bill lines
      if (data.lines.length > 0) {
        const linesToInsert = data.lines.map((line, index) => ({
          bill_id: bill.id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          item_id: line.item_id || null,
          position: index,
          line_total: calculateLineTotal(line),
        }));

        const { error: linesError } = await supabase
          .from('bill_lines')
          .insert(linesToInsert);

        if (linesError) throw linesError;
      }

      return bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({
        title: 'Achat créé',
        description: "La facture fournisseur a été créée avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de créer l'achat: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: BillFormData & { id: string }) => {
      // Calculate totals
      const { subtotal, taxAmount, total } = calculateTotals(data.lines);

      // Update the bill
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .update({
          contact_id: data.contact_id || null,
          subject: data.subject || null,
          vendor_reference: data.vendor_reference || null,
          date: data.date,
          due_date: data.due_date || null,
          notes: data.notes || null,
          subtotal,
          tax_amount: taxAmount,
          total,
        })
        .eq('id', id)
        .select()
        .single();

      if (billError) throw billError;

      // Delete existing lines and recreate
      await supabase.from('bill_lines').delete().eq('bill_id', id);

      if (data.lines.length > 0) {
        const linesToInsert = data.lines.map((line, index) => ({
          bill_id: id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
          item_id: line.item_id || null,
          position: index,
          line_total: calculateLineTotal(line),
        }));

        const { error: linesError } = await supabase
          .from('bill_lines')
          .insert(linesToInsert);

        if (linesError) throw linesError;
      }

      return bill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({
        title: 'Achat modifié',
        description: "La facture fournisseur a été mise à jour avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de modifier l'achat: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateBillStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BillStatus }) => {
      const { data, error } = await supabase
        .from('bills')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      const statusLabels: Record<BillStatus, string> = {
        draft: 'brouillon',
        received: 'reçue',
        paid: 'payée',
        partially_paid: 'partiellement payée',
        overdue: 'en retard',
        cancelled: 'annulée',
      };
      toast({
        title: 'Statut mis à jour',
        description: `La facture fournisseur est maintenant ${statusLabels[status]}.`,
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

export function useRecordBillPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      // Get current bill
      const { data: bill, error: fetchError } = await supabase
        .from('bills')
        .select('total, amount_paid')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newAmountPaid = Number(bill.amount_paid || 0) + amount;
      const total = Number(bill.total);
      
      // Determine new status
      let newStatus: BillStatus;
      if (newAmountPaid >= total) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partially_paid';
      } else {
        newStatus = 'received';
      }

      const { data, error } = await supabase
        .from('bills')
        .update({ 
          amount_paid: newAmountPaid,
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
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

export function useDeleteBill() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete lines first
      await supabase.from('bill_lines').delete().eq('bill_id', id);
      
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({
        title: 'Achat supprimé',
        description: "La facture fournisseur a été supprimée avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de supprimer l'achat: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Helper functions
function calculateLineTotal(line: BillLineInput): number {
  return line.quantity * line.unit_price;
}

function calculateTotals(lines: BillLineInput[]) {
  let subtotal = 0;
  let taxAmount = 0;

  lines.forEach((line) => {
    const lineSubtotal = calculateLineTotal(line);
    subtotal += lineSubtotal;
    taxAmount += lineSubtotal * ((line.tax_rate || 0) / 100);
  });

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
  };
}

export { calculateLineTotal, calculateTotals };
