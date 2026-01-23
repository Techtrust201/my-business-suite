import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, MapPin, Filter, Calendar, Users, UserCheck, UserPlus } from 'lucide-react';
import { useActiveProspectStatuses, type ProspectStatus } from '@/hooks/useProspectStatuses';
import { useOrganizationUsers } from '@/hooks/useOrganizationUsers';

interface MapFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  // New advanced filters
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  userFilter: string;
  onUserFilterChange: (value: string) => void;
  createdByFilter: string;
  onCreatedByFilterChange: (value: string) => void;
  zoneFilter: string;
  onZoneFilterChange: (value: string) => void;
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

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Toutes périodes' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
];

// French departments for zone filter
const ZONE_OPTIONS = [
  { value: 'all', label: 'Toutes zones' },
  { value: 'idf', label: 'Île-de-France' },
  { value: 'north', label: 'Nord' },
  { value: 'east', label: 'Est' },
  { value: 'west', label: 'Ouest' },
  { value: 'south', label: 'Sud' },
  { value: 'center', label: 'Centre' },
  // Common departments
  { value: '75', label: 'Paris (75)' },
  { value: '69', label: 'Rhône (69)' },
  { value: '13', label: 'Bouches-du-Rhône (13)' },
  { value: '31', label: 'Haute-Garonne (31)' },
  { value: '33', label: 'Gironde (33)' },
  { value: '59', label: 'Nord (59)' },
  { value: '67', label: 'Bas-Rhin (67)' },
  { value: '44', label: 'Loire-Atlantique (44)' },
];

export function MapFilters({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  periodFilter,
  onPeriodFilterChange,
  userFilter,
  onUserFilterChange,
  createdByFilter,
  onCreatedByFilterChange,
  zoneFilter,
  onZoneFilterChange,
  onClearFilters,
  totalCount,
  filteredCount,
  geolocatedCount,
}: MapFiltersProps) {
  const { data: statuses } = useActiveProspectStatuses();
  const { data: users } = useOrganizationUsers();

  const hasActiveFilters = statusFilter !== 'all' || 
    searchQuery !== '' || 
    sourceFilter !== 'all' ||
    periodFilter !== 'all' ||
    userFilter !== 'all' ||
    createdByFilter !== 'all' ||
    zoneFilter !== 'all';

  const activeFilterCount = [
    statusFilter !== 'all',
    sourceFilter !== 'all',
    periodFilter !== 'all',
    userFilter !== 'all',
    createdByFilter !== 'all',
    zoneFilter !== 'all',
    searchQuery !== '',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Main filters row */}
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
            Effacer ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Advanced filters row */}
      <div className="flex flex-wrap gap-3">
        {/* Period filter */}
        <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assigned to filter */}
        <Select value={userFilter} onValueChange={onUserFilterChange}>
          <SelectTrigger className="w-[180px]">
            <UserCheck className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Assigné à" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous (assigné)</SelectItem>
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.first_name && user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Created by filter */}
        <Select value={createdByFilter} onValueChange={onCreatedByFilterChange}>
          <SelectTrigger className="w-[180px]">
            <UserPlus className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Créé par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous (créateur)</SelectItem>
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.first_name && user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Zone filter */}
        <Select value={zoneFilter} onValueChange={onZoneFilterChange}>
          <SelectTrigger className="w-[180px]">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            {ZONE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
