import { useState, useMemo } from 'react';
import { Search, Package } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Article {
  id: string;
  name: string;
  unit_price: number;
  description?: string | null;
  reference?: string | null;
}

interface ArticlePickerProps {
  articles: Article[] | undefined;
  onSelect: (articleId: string) => void;
  buttonLabel?: string;
  align?: 'start' | 'center' | 'end';
}

export const ArticlePicker = ({ 
  articles, 
  onSelect, 
  buttonLabel = "Ajouter un article",
  align = "end"
}: ArticlePickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    if (!searchQuery.trim()) return articles;
    
    const query = searchQuery.toLowerCase();
    return articles.filter(article => 
      article.name.toLowerCase().includes(query) ||
      article.reference?.toLowerCase().includes(query) ||
      article.description?.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  const handleSelect = (articleId: string) => {
    onSelect(articleId);
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
          <Package className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align={align}>
        <div className="p-3 space-y-3">
          <p className="text-sm font-medium">Articles du catalogue</p>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Articles List with native scroll */}
          <div className="max-h-[250px] overflow-y-auto -mx-1 px-1">
            {filteredArticles.length > 0 ? (
              <div className="space-y-0.5">
                {filteredArticles.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => handleSelect(article.id)}
                    className="w-full text-left px-2 py-2 text-sm hover:bg-accent rounded-md flex justify-between items-center gap-2 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{article.name}</span>
                      {article.reference && (
                        <span className="block text-xs text-muted-foreground truncate">
                          Réf: {article.reference}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground whitespace-nowrap text-sm">
                      {formatPrice(article.unit_price)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-2 text-center">
                {articles?.length === 0 
                  ? "Aucun article dans le catalogue" 
                  : "Aucun article trouvé"
                }
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
