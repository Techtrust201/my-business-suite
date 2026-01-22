import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { generateExpenseEntry, deleteEntriesByReference } from "@/hooks/useAccountingEntries";

export type ExpenseCategory = 
  | 'restauration'
  | 'transport'
  | 'fournitures'
  | 'telecom'
  | 'abonnements'
  | 'frais_bancaires'
  | 'hebergement'
  | 'marketing'
  | 'formation'
  | 'autre';

export type PaymentMethod = 'bank_transfer' | 'card' | 'cash' | 'check' | 'other';

export interface Expense {
  id: string;
  organization_id: string;
  date: string;
  amount: number;
  description: string | null;
  category: ExpenseCategory;
  vendor_name: string | null;
  receipt_url: string | null;
  payment_method: PaymentMethod;
  matched_transaction_id: string | null;
  notes: string | null;
  is_reimbursable: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseFormData {
  date: string;
  amount: number;
  description?: string;
  category: ExpenseCategory;
  vendor_name?: string;
  payment_method: PaymentMethod;
  notes?: string;
  is_reimbursable: boolean;
  receipt_file?: File;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  category?: ExpenseCategory;
  isReimbursable?: boolean;
  search?: string;
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; color: string }[] = [
  { value: 'restauration', label: 'Restauration', color: 'bg-orange-500' },
  { value: 'transport', label: 'Transport', color: 'bg-blue-500' },
  { value: 'fournitures', label: 'Fournitures', color: 'bg-gray-500' },
  { value: 'telecom', label: 'Télécom', color: 'bg-violet-500' },
  { value: 'abonnements', label: 'Abonnements', color: 'bg-indigo-500' },
  { value: 'frais_bancaires', label: 'Frais bancaires', color: 'bg-red-500' },
  { value: 'hebergement', label: 'Hébergement', color: 'bg-green-500' },
  { value: 'marketing', label: 'Marketing', color: 'bg-pink-500' },
  { value: 'formation', label: 'Formation', color: 'bg-yellow-500' },
  { value: 'autre', label: 'Autre', color: 'bg-slate-400' },
];

export function getCategoryInfo(category: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

// Upload receipt to storage
async function uploadReceipt(file: File, organizationId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${organizationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName);

  return publicUrl;
}

// Delete receipt from storage
async function deleteReceipt(url: string): Promise<void> {
  try {
    const path = url.split('/receipts/')[1];
    if (path) {
      await supabase.storage.from('receipts').remove([path]);
    }
  } catch (error) {
    console.warn('Failed to delete receipt:', error);
  }
}

// List expenses with filters
export function useExpenses(filters: ExpenseFilters = {}) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['expenses', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });

      if (filters.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.isReimbursable !== undefined) {
        query = query.eq('is_reimbursable', filters.isReimbursable);
      }
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!organization?.id,
  });
}

// Get single expense
export function useExpense(id: string | null) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['expense', id],
    queryFn: async () => {
      if (!id || !organization?.id) return null;

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organization.id)
        .single();

      if (error) throw error;
      return data as Expense;
    },
    enabled: !!id && !!organization?.id,
  });
}

// Create expense
export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      if (!organization?.id) throw new Error('Organisation non trouvée');

      let receiptUrl: string | undefined;

      // Upload receipt if provided
      if (data.receipt_file) {
        receiptUrl = await uploadReceipt(data.receipt_file, organization.id);
      }

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          organization_id: organization.id,
          date: data.date,
          amount: data.amount,
          description: data.description || null,
          category: data.category,
          vendor_name: data.vendor_name || null,
          payment_method: data.payment_method,
          notes: data.notes || null,
          is_reimbursable: data.is_reimbursable,
          receipt_url: receiptUrl || null,
        })
        .select()
        .single();

      if (error) {
        // Clean up uploaded file if insert failed
        if (receiptUrl) await deleteReceipt(receiptUrl);
        throw error;
      }

      // Générer l'écriture comptable
      await generateExpenseEntry(
        organization.id,
        expense.id,
        data.date,
        data.amount,
        data.category,
        data.payment_method,
        data.vendor_name,
        data.description
      );

      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-kpis'] });
      toast.success('Dépense créée avec succès');
    },
    onError: (error) => {
      console.error('Error creating expense:', error);
      toast.error('Erreur lors de la création de la dépense');
    },
  });
}

// Update expense
export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, data, oldReceiptUrl }: { id: string; data: ExpenseFormData; oldReceiptUrl?: string }) => {
      if (!organization?.id) throw new Error('Organisation non trouvée');

      let receiptUrl: string | undefined;

      // Upload new receipt if provided
      if (data.receipt_file) {
        receiptUrl = await uploadReceipt(data.receipt_file, organization.id);
        // Delete old receipt
        if (oldReceiptUrl) await deleteReceipt(oldReceiptUrl);
      }

      const updateData: Record<string, unknown> = {
        date: data.date,
        amount: data.amount,
        description: data.description || null,
        category: data.category,
        vendor_name: data.vendor_name || null,
        payment_method: data.payment_method,
        notes: data.notes || null,
        is_reimbursable: data.is_reimbursable,
      };

      if (receiptUrl) {
        updateData.receipt_url = receiptUrl;
      }

      const { data: expense, error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) throw error;
      return expense;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense', id] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      toast.success('Dépense mise à jour');
    },
    onError: (error) => {
      console.error('Error updating expense:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

// Delete expense
export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, receiptUrl }: { id: string; receiptUrl?: string }) => {
      if (!organization?.id) throw new Error('Organisation non trouvée');

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) throw error;

      // Supprimer l'écriture comptable liée
      await deleteEntriesByReference('expense', id);

      // Delete receipt from storage
      if (receiptUrl) await deleteReceipt(receiptUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-kpis'] });
      toast.success('Dépense supprimée');
    },
    onError: (error) => {
      console.error('Error deleting expense:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}

// Get expense statistics
export function useExpenseStats() {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['expense-stats', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Get all expenses for this month
      const { data: monthlyExpenses, error: monthError } = await supabase
        .from('expenses')
        .select('amount, is_reimbursable, category')
        .eq('organization_id', organization.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (monthError) throw monthError;

      const totalMonth = monthlyExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const reimbursableAmount = monthlyExpenses?.filter(e => e.is_reimbursable).reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const expenseCount = monthlyExpenses?.length || 0;

      // Group by category
      const byCategory: Record<string, number> = {};
      monthlyExpenses?.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
      });

      return {
        totalMonth,
        reimbursableAmount,
        expenseCount,
        byCategory,
      };
    },
    enabled: !!organization?.id,
  });
}
