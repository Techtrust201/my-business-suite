import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, MapPin, Filter } from 'lucide-react';
import { useActiveProspectStatuses, type ProspectStatus } from '@/hooks/useProspectStatuses';

interface MapFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
  geolocatedCount: number;
}

const SOURCE_OPTIONS = [
  { value: 'all', label: 'Toutes sources' },
  { value: 'terrain', label: 'Terrain' },
  { value: 'web', label: 'Web' },
  { value: 'referral', label: 'Recommandation' },
  { value: 'import', label: 'Import' },
];

export function MapFilters({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  onClearFilters,
  totalCount,
  filteredCount,
  geolocatedCount,
}: MapFiltersProps) {
  const { data: statuses } = useActiveProspectStatuses();

  const hasActiveFilters = statusFilter !== 'all' || searchQuery !== '' || sourceFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une entreprise, ville..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {statuses?.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4" />
          <span>
            <strong className="text-foreground">{filteredCount}</strong> prospect{filteredCount !== 1 ? 's' : ''} 
            {filteredCount !== totalCount && ` sur ${totalCount}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          <span>
            <strong className="text-foreground">{geolocatedCount}</strong> géolocalisé{geolocatedCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        {/* Status legend */}
        {statuses && statuses.length > 0 && (
          <div className="hidden md:flex items-center gap-2 ml-auto">
            {statuses.slice(0, 6).map((status) => (
              <Badge
                key={status.id}
                variant="outline"
                className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  borderColor: status.color,
                  backgroundColor: statusFilter === status.id ? status.color : 'transparent',
                  color: statusFilter === status.id ? 'white' : status.color,
                }}
                onClick={() => onStatusFilterChange(statusFilter === status.id ? 'all' : status.id)}
              >
                {status.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
