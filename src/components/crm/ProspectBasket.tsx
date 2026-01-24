import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  TrendingUp,
  FileText,
  Eraser,
} from 'lucide-react';
import {
  useProspectBasket,
  useAddToProspectBasket,
  useUpdateBasketItem,
  useRemoveFromBasket,
  useClearBasket,
  calculateBasketTotals,
  type ProspectBasketItemWithArticle,
} from '@/hooks/useProspectBasket';
import { useArticles } from '@/hooks/useArticles';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { ArticlePicker } from '@/components/shared/ArticlePicker';
import { cn } from '@/lib/utils';

interface ProspectBasketProps {
  prospectId: string;
  onCreateQuote?: (items: ProspectBasketItemWithArticle[]) => void;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

function BasketItem({
  item,
  onUpdateQuantity,
  onRemove,
  showMargin,
}: {
  item: ProspectBasketItemWithArticle;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  showMargin: boolean;
}) {
  const price = item.unit_price ?? item.article.unit_price;
  const lineTotal = price * item.quantity;
  const margin = lineTotal - (item.article.purchase_price ?? 0) * item.quantity;
  const marginPercent = lineTotal > 0 ? (margin / lineTotal) * 100 : 0;

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Package className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.article.name}</p>
        {item.article.description && (
          <p className="text-xs text-muted-foreground truncate">{item.article.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{formatPrice(price)} / {item.article.unit || 'unité'}</span>
          {showMargin && marginPercent > 0 && (
            <Badge variant="outline" className="text-green-600 text-[10px]">
              +{marginPercent.toFixed(0)}%
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-r-none"
            onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdateQuantity(Math.max(1, Number(e.target.value)))}
            className="h-7 w-12 text-center border-0 rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min={1}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-l-none"
            onClick={() => onUpdateQuantity(item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-right min-w-[80px]">
          <p className="font-medium text-sm">{formatPrice(lineTotal)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ProspectBasket({ prospectId, onCreateQuote }: ProspectBasketProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const { data: basketItems, isLoading } = useProspectBasket(prospectId);
  const { articles } = useArticles();
  const { canViewMargins } = useCurrentUserPermissions();
  
  const addToBasket = useAddToProspectBasket();
  const updateItem = useUpdateBasketItem();
  const removeFromBasket = useRemoveFromBasket();
  const clearBasket = useClearBasket();

  const totals = basketItems ? calculateBasketTotals(basketItems) : null;

  const handleAddArticle = (articleId: string) => {
    addToBasket.mutate({ prospectId, articleId });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    updateItem.mutate({ id: itemId, quantity });
  };

  const handleRemove = (itemId: string) => {
    removeFromBasket.mutate({ id: itemId, prospectId });
  };

  const handleClearBasket = () => {
    clearBasket.mutate(prospectId);
    setShowClearConfirm(false);
  };

  const handleCreateQuote = () => {
    if (basketItems && basketItems.length > 0 && onCreateQuote) {
      onCreateQuote(basketItems);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Panier articles
                {basketItems && basketItems.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {totals?.totalQuantity} article{(totals?.totalQuantity || 0) > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Sélectionnez des articles pour ce prospect
              </CardDescription>
            </div>
            {basketItems && basketItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Eraser className="h-4 w-4 mr-1" />
                Vider
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add article */}
          <ArticlePicker
            articles={articles}
            onSelect={handleAddArticle}
            buttonLabel="Ajouter un article"
            buttonVariant="outline"
            className="w-full"
          />

          {/* Basket items */}
          {!basketItems || basketItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Panier vide</p>
              <p className="text-xs text-muted-foreground">
                Ajoutez des articles pour préparer un devis
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {basketItems.map((item) => (
                  <BasketItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={(qty) => handleUpdateQuantity(item.id, qty)}
                    onRemove={() => handleRemove(item.id)}
                    showMargin={canViewMargins}
                  />
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total HT</span>
                  <span className="font-medium">{formatPrice(totals?.subtotal || 0)}</span>
                </div>
                {canViewMargins && totals && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Marge estimée
                    </span>
                    <span className={cn(
                      'font-medium',
                      (totals.margin || 0) >= 0 ? 'text-green-600' : 'text-destructive'
                    )}>
                      {formatPrice(totals.margin)} ({totals.marginPercent}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Create quote button */}
              <Button
                className="w-full"
                onClick={handleCreateQuote}
                disabled={!onCreateQuote}
              >
                <FileText className="h-4 w-4 mr-2" />
                Créer un devis
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Clear confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vider le panier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les articles du panier seront supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearBasket} className="bg-destructive text-destructive-foreground">
              Vider le panier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
