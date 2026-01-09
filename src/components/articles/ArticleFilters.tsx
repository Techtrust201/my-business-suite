import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { ArticleType } from '@/hooks/useArticles';

interface ArticleFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  type: ArticleType | undefined;
  onTypeChange: (value: ArticleType | undefined) => void;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
}

export const ArticleFilters = ({
  search,
  onSearchChange,
  type,
  onTypeChange,
  showInactive,
  onShowInactiveChange,
}: ArticleFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1 w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, référence..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select
        value={type ?? 'all'}
        onValueChange={(value) => onTypeChange(value === 'all' ? undefined : value as ArticleType)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          <SelectItem value="product">Produits</SelectItem>
          <SelectItem value="service">Services</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center space-x-2">
        <Switch
          id="show-inactive"
          checked={showInactive}
          onCheckedChange={onShowInactiveChange}
        />
        <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
          Afficher les inactifs
        </Label>
      </div>
    </div>
  );
};
