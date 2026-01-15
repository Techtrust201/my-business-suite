import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Article } from '@/hooks/useArticles';
import { Package, Wrench, Tag, Hash, Euro, Scale, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ArticleDetailsProps {
  article: Article | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ArticleDetails = ({ article, open, onOpenChange }: ArticleDetailsProps) => {
  if (!article) return null;

  const typeLabel = article.type === 'product' ? 'Produit' : 'Service';
  const TypeIcon = article.type === 'product' ? Package : Wrench;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5" />
            {article.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status badges */}
          <div className="flex gap-2">
            <Badge variant={article.type === 'product' ? 'default' : 'secondary'}>
              {typeLabel}
            </Badge>
            <Badge variant={article.is_active ? 'outline' : 'destructive'}>
              {article.is_active ? 'Actif' : 'Inactif'}
            </Badge>
            {article.category && (
              <Badge variant="outline">
                <Tag className="h-3 w-3 mr-1" />
                {article.category}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Reference and description */}
          <div className="space-y-4">
            {article.reference && (
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Référence</p>
                  <p className="text-sm text-muted-foreground">{article.reference}</p>
                </div>
              </div>
            )}

            {article.description && (
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{article.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Euro className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Prix de vente HT</p>
                <p className="text-lg font-semibold">{formatPrice(article.unit_price)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Scale className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Unité</p>
                <p className="text-sm text-muted-foreground">{article.unit}</p>
              </div>
            </div>
          </div>

          {/* Margin section - Only for products with purchase price */}
          {article.type === 'product' && article.purchase_price != null && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium">Rentabilité</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Prix d'achat</p>
                    <p className="font-medium">{formatPrice(article.purchase_price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Marge</p>
                    <p className={cn(
                      "font-medium",
                      (article.margin ?? 0) >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      {article.margin != null ? formatPrice(article.margin) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Marge %</p>
                    <p className={cn(
                      "font-medium",
                      (article.margin_percent ?? 0) >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      {article.margin_percent != null ? `${article.margin_percent.toFixed(1)}%` : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Dates */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Créé le {format(new Date(article.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
            <p>
              Modifié le {format(new Date(article.updated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
