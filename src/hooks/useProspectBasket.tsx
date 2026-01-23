import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ProspectBasketItem {
  id: string;
  prospect_id: string;
  organization_id: string;
  article_id: string;
  quantity: number;
  unit_price: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectBasketItemWithArticle extends ProspectBasketItem {
  article: {
    id: string;
    name: string;
    description: string | null;
    unit_price: number;
    purchase_price: number | null;
    unit: string | null;
    tax_rate_id: string | null;
  };
}

export function useProspectBasket(prospectId?: string) {
  const { organization } = useOrganization();

  return useQuery({
    queryKey: ['prospect-basket', prospectId],
    queryFn: async () => {
      if (!prospectId || !organization?.id) return [];

      const { data, error } = await supabase
        .from('prospect_basket_items')
        .select(`
          *,
          article:articles(id, name, description, unit_price, purchase_price, unit, tax_rate_id)
        `)
        .eq('prospect_id', prospectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching prospect basket:', error);
        return [];
      }

      return data as ProspectBasketItemWithArticle[];
    },
    enabled: !!prospectId && !!organization?.id,
  });
}

export function useAddToProspectBasket() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      prospectId,
      articleId,
      quantity = 1,
      unitPrice,
      notes,
    }: {
      prospectId: string;
      articleId: string;
      quantity?: number;
      unitPrice?: number;
      notes?: string;
    }) => {
      if (!organization?.id || !user?.id) throw new Error('No organization or user');

      // Check if article is already in basket
      const { data: existing } = await supabase
        .from('prospect_basket_items')
        .select('id, quantity')
        .eq('prospect_id', prospectId)
        .eq('article_id', articleId)
        .single();

      if (existing) {
        // Update quantity
        const { data, error } = await supabase
          .from('prospect_basket_items')
          .update({
            quantity: existing.quantity + quantity,
            unit_price: unitPrice,
            notes,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Insert new item
      const { data, error } = await supabase
        .from('prospect_basket_items')
        .insert({
          prospect_id: prospectId,
          organization_id: organization.id,
          article_id: articleId,
          quantity,
          unit_price: unitPrice,
          notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-basket', variables.prospectId] });
      toast.success('Article ajouté au panier');
    },
    onError: (error) => {
      console.error('Error adding to basket:', error);
      toast.error("Erreur lors de l'ajout au panier");
    },
  });
}

export function useUpdateBasketItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      quantity,
      unitPrice,
      notes,
    }: {
      id: string;
      quantity?: number;
      unitPrice?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('prospect_basket_items')
        .update({
          quantity,
          unit_price: unitPrice,
          notes,
        })
        .eq('id', id)
        .select('prospect_id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-basket', data.prospect_id] });
    },
    onError: (error) => {
      console.error('Error updating basket item:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

export function useRemoveFromBasket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospectId }: { id: string; prospectId: string }) => {
      const { error } = await supabase
        .from('prospect_basket_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { prospectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-basket', data.prospectId] });
      toast.success('Article retiré du panier');
    },
    onError: (error) => {
      console.error('Error removing from basket:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}

export function useClearBasket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospectId: string) => {
      const { error } = await supabase
        .from('prospect_basket_items')
        .delete()
        .eq('prospect_id', prospectId);

      if (error) throw error;
      return { prospectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-basket', data.prospectId] });
      toast.success('Panier vidé');
    },
    onError: (error) => {
      console.error('Error clearing basket:', error);
      toast.error('Erreur lors du vidage du panier');
    },
  });
}

// Calculate basket totals
export function calculateBasketTotals(items: ProspectBasketItemWithArticle[], taxRates?: { id: string; rate: number }[]) {
  let subtotal = 0;
  let totalCost = 0;

  items.forEach((item) => {
    const price = item.unit_price ?? item.article.unit_price;
    const lineTotal = price * item.quantity;
    subtotal += lineTotal;
    
    const costPrice = (item.article.purchase_price ?? 0) * item.quantity;
    totalCost += costPrice;
  });

  const margin = subtotal - totalCost;
  const marginPercent = subtotal > 0 ? (margin / subtotal) * 100 : 0;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    marginPercent: Math.round(marginPercent * 10) / 10,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
