import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { ContactType } from '@/hooks/useClients';

interface ClientFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  type: ContactType | 'all';
  onTypeChange: (value: ContactType | 'all') => void;
}

export function ClientFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
}: ClientFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un contact..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={type} onValueChange={(value) => onTypeChange(value as ContactType | 'all')}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Type de contact" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les contacts</SelectItem>
          <SelectItem value="client">Clients</SelectItem>
          <SelectItem value="supplier">Fournisseurs</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
