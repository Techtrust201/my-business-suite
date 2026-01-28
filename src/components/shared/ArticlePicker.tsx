import { useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Article {
  id: string;
  name: string;
  description?: string | null;
  unit_price: number;
  unit?: string | null;
  reference?: string | null;
  purchase_price?: number | null;
}

interface ArticlePickerProps {
  articles: Article[] | undefined;
  onSelect: (articleId: string) => void;
  buttonLabel?: string;
  buttonVariant?: ButtonProps['variant'];
  buttonSize?: ButtonProps['size'];
  className?: string;
  selectedIds?: string[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

export function ArticlePicker({
  articles,
  onSelect,
  buttonLabel = 'Ajouter un article',
  buttonVariant = 'default',
  buttonSize = 'default',
  className,
  selectedIds = [],
}: ArticlePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = articles?.filter((article) => {
    const query = searchQuery.toLowerCase();
    return (
      article.name.toLowerCase().includes(query) ||
      article.description?.toLowerCase().includes(query) ||
      article.reference?.toLowerCase().includes(query)
    );
  }) || [];

  const handleSelect = (articleId: string) => {
    onSelect(articleId);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={true}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={className}>
          <Plus className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[500px] max-h-[80vh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Sélectionner un article</DialogTitle>
          <DialogDescription>
            Choisissez un article à ajouter au panier
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Rechercher un article..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-[400px]">
              <CommandEmpty>
                <div className="flex flex-col items-center py-6 text-center">
                  <Package className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Aucun article trouvé</p>
                  <p className="text-xs text-muted-foreground">
                    Essayez avec d'autres termes de recherche
                  </p>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredArticles.map((article) => {
                  const isSelected = selectedIds.includes(article.id);
                  return (
                    <CommandItem
                      key={article.id}
                      value={article.id}
                      onSelect={() => handleSelect(article.id)}
                      className={cn(
                        'flex items-start gap-3 p-3 cursor-pointer',
                        isSelected && 'bg-muted'
                      )}
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{article.name}</p>
                          {article.reference && (
                            <Badge variant="outline" className="text-[10px]">
                              {article.reference}
                            </Badge>
                          )}
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                          )}
                        </div>
                        {article.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {article.description}
                          </p>
                        )}
                        <p className="text-xs font-medium text-primary mt-0.5">
                          {formatPrice(article.unit_price)}
                          {article.unit && <span className="text-muted-foreground"> / {article.unit}</span>}
                        </p>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}
