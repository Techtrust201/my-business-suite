import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ArticleType = 'product' | 'service';

export interface Article {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  reference: string | null;
  unit_price: number;
  unit: string;
  tax_rate_id: string | null;
  type: ArticleType;
  category: string | null;
  is_active: boolean;
  purchase_price: number | null;
  margin: number | null;
  margin_percent: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleFormData {
  name: string;
  description?: string;
  reference?: string;
  unit_price: number;
  unit: string;
  tax_rate_id?: string;
  type: ArticleType;
  category?: string;
  is_active?: boolean;
  purchase_price?: number;
}

// Calcul automatique de la marge
const calculateMargin = (purchasePrice: number | undefined, salePrice: number) => {
  if (!purchasePrice || purchasePrice <= 0) {
    return { margin: null, margin_percent: null };
  }
  const margin = salePrice - purchasePrice;
  const margin_percent = salePrice > 0 ? (margin / salePrice) * 100 : 0;
  return { margin, margin_percent };
};

interface UseArticlesOptions {
  type?: ArticleType;
  search?: string;
  showInactive?: boolean;
}

export const useArticles = (options: UseArticlesOptions = {}) => {
  const { type, search, showInactive = false } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['articles', type, search, showInactive];

  const { data: articles, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('articles')
        .select('*')
        .order('name', { ascending: true });

      if (!showInactive) {
        query = query.eq('is_active', true);
      }

      if (type) {
        query = query.eq('type', type);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,reference.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Article[];
    },
  });

  const createArticle = useMutation({
    mutationFn: async (articleData: ArticleFormData) => {
      // Get user's organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Aucune organisation trouvée');
      }

      // Calculer la marge automatiquement pour les produits et services
      const marginData = calculateMargin(articleData.purchase_price, articleData.unit_price);

      const { data, error } = await supabase
        .from('articles')
        .insert({
          ...articleData,
          ...marginData,
          organization_id: profile.organization_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast({
        title: 'Article créé',
        description: 'L\'article a été ajouté avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de créer l'article: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateArticle = useMutation({
    mutationFn: async ({ id, ...articleData }: ArticleFormData & { id: string }) => {
      // Calculer la marge automatiquement pour les produits et services
      const marginData = calculateMargin(articleData.purchase_price, articleData.unit_price);

      const { data, error } = await supabase
        .from('articles')
        .update({
          ...articleData,
          ...marginData,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast({
        title: 'Article modifié',
        description: 'L\'article a été mis à jour avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de modifier l'article: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast({
        title: 'Article supprimé',
        description: 'L\'article a été supprimé avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: `Impossible de supprimer l'article: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    articles: articles ?? [],
    isLoading,
    error,
    createArticle,
    updateArticle,
    deleteArticle,
  };
};

export const useTaxRates = () => {
  return useQuery({
    queryKey: ['tax_rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('is_active', true)
        .order('rate', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};
