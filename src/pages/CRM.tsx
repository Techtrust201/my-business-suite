import { useState, useMemo, useDeferredValue } from 'react';
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Map, List, RefreshCw, Settings, MapPin } from 'lucide-react';
import { ProspectMap } from '@/components/crm/ProspectMap';
import { MapFilters } from '@/components/crm/MapFilters';
import { ProspectsTable } from '@/components/crm/ProspectsTable';
import { ProspectForm } from '@/components/crm/ProspectForm';
import { ProspectDetails } from '@/components/crm/ProspectDetails';
import { ProspectKPICards } from '@/components/crm/ProspectKPICards';
import { ProspectFunnel } from '@/components/crm/ProspectFunnel';
import { ProspectActivityFeed } from '@/components/crm/ProspectActivityFeed';
import { ProspectCSVActions } from '@/components/crm/ProspectCSVActions';
import { useProspects, useDeleteProspect, type ProspectWithStatus } from '@/hooks/useProspects';
import { useInitProspectStatuses, useProspectStatuses } from '@/hooks/useProspectStatuses';
import { useBatchGeocode } from '@/hooks/useGeocoding';
import { useCRMRealtime } from '@/hooks/useRealtimeSubscription';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Postal code to region mapping for France
const ZONE_PREFIXES: Record<string, string[]> = {
  idf: ['75', '77', '78', '91', '92', '93', '94', '95'],
  north: ['59', '62', '60', '80', '02'],
  east: ['67', '68', '57', '54', '55', '88', '70', '25', '39', '90'],
  west: ['29', '22', '56', '35', '44', '49', '53', '72', '85'],
  south: ['13', '83', '06', '04', '05', '84', '30', '34', '11', '66'],
  center: ['18', '28', '36', '37', '41', '45', '03', '15', '43', '63'],
};

const CRM = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  
  // New advanced filters
  const [periodFilter, setPeriodFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [createdByFilter, setCreatedByFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  
  const [selectedProspect, setSelectedProspect] = useState<ProspectWithStatus | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<ProspectWithStatus | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Enable realtime updates for CRM data (KPIs, funnel, prospects)
  useCRMRealtime();

  const { data: statuses, isLoading: isLoadingStatuses } = useProspectStatuses();
  const initStatuses = useInitProspectStatuses();
  const deleteProspect = useDeleteProspect();
  const { geocodeBatch, isProcessing: isGeocoding, progress } = useBatchGeocode();

  // Build query options for basic filters
  const queryOptions = useMemo(() => ({
    statusId: statusFilter !== 'all' ? statusFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    assignedTo: userFilter !== 'all' ? userFilter : undefined,
    createdBy: createdByFilter !== 'all' ? createdByFilter : undefined,
    search: deferredSearch || undefined,
  }), [statusFilter, sourceFilter, userFilter, createdByFilter, deferredSearch]);

  const { data: prospects, isLoading } = useProspects(queryOptions);

  // Apply client-side filters (period and zone)
  const filteredProspects = useMemo(() => {
    if (!prospects) return [];
    
    let result = [...prospects];

    // Period filter
    if (periodFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (periodFilter) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'quarter':
          startDate = startOfQuarter(now);
          break;
        default:
          startDate = new Date(0);
      }

      result = result.filter(p => new Date(p.created_at) >= startDate);
    }

    // Zone filter
    if (zoneFilter !== 'all') {
      if (ZONE_PREFIXES[zoneFilter]) {
        // Region filter
        const prefixes = ZONE_PREFIXES[zoneFilter];
        result = result.filter(p => 
          p.postal_code && prefixes.some(prefix => p.postal_code?.startsWith(prefix))
        );
      } else {
        // Department filter (2-digit prefix)
        result = result.filter(p => 
          p.postal_code?.startsWith(zoneFilter)
        );
      }
    }

    return result;
  }, [prospects, periodFilter, zoneFilter]);

  // Calculate counts
  const totalCount = prospects?.length || 0;
  const filteredCount = filteredProspects.length;
  const geolocatedCount = filteredProspects.filter(p => p.latitude && p.longitude).length;

  // Check if statuses need initialization
  const needsStatusInit = !isLoadingStatuses && (!statuses || statuses.length === 0);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSourceFilter('all');
    setSearchQuery('');
    setPeriodFilter('all');
    setUserFilter('all');
    setCreatedByFilter('all');
    setZoneFilter('all');
  };

  const handleNewProspect = () => {
    setEditingProspect(null);
    setIsFormOpen(true);
  };

  const handleEditProspect = (prospect: ProspectWithStatus) => {
    setEditingProspect(prospect);
    setIsFormOpen(true);
  };

  const handleViewProspect = (prospect: ProspectWithStatus) => {
    setSelectedProspect(prospect);
    setIsDetailsOpen(true);
  };

  const handleEditFromDetails = (prospect: ProspectWithStatus) => {
    setIsDetailsOpen(false);
    setEditingProspect(prospect);
    setIsFormOpen(true);
  };

  const handleProspectClick = (prospect: ProspectWithStatus) => {
    setSelectedProspect(prospect);
  };

  const handleDeleteProspect = (prospect: ProspectWithStatus) => {
    deleteProspect.mutate(prospect.id, {
      onSuccess: () => {
        // Close details if the deleted prospect was selected
        if (selectedProspect?.id === prospect.id) {
          setSelectedProspect(null);
          setIsDetailsOpen(false);
        }
      }
    });
  };

  const handleGeocodeAll = async () => {
    if (!filteredProspects) return;
    
    const prospectsToGeocode = filteredProspects.filter(
      p => !p.latitude && !p.longitude && (p.address_line1 || p.city)
    );

    if (prospectsToGeocode.length === 0) {
      toast.info('Tous les prospects avec adresse sont déjà géolocalisés');
      return;
    }

    await geocodeBatch(
      prospectsToGeocode.map(p => ({
        id: p.id,
        address_line1: p.address_line1,
        city: p.city,
        postal_code: p.postal_code,
      }))
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">CRM Prospection</h1>
            <p className="text-muted-foreground">
              Gérez vos prospects et visualisez-les sur la carte
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ProspectCSVActions prospects={prospects || []} filteredCount={filteredCount} />
            <Button variant="outline" size="sm" onClick={() => navigate('/parametres?tab=crm')}>
              <Settings className="h-4 w-4 mr-2" />
              Statuts
            </Button>
            <Button onClick={handleNewProspect}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau prospect
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <ProspectKPICards />

        {/* Status initialization warning */}
        {needsStatusInit && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-amber-800">Configuration requise</p>
                  <p className="text-sm text-amber-700">
                    Initialisez les statuts commerciaux pour commencer à utiliser le CRM
                  </p>
                </div>
                <Button
                  onClick={() => initStatuses.mutate()}
                  disabled={initStatuses.isPending}
                >
                  {initStatuses.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Initialiser les statuts
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main content */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Carte de prospection</CardTitle>
              <div className="flex items-center gap-2">
                {geolocatedCount < filteredCount && filteredCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeocodeAll}
                    disabled={isGeocoding}
                  >
                    {isGeocoding ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        {progress.current}/{progress.total}
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-2" />
                        Géocoder tout ({filteredCount - geolocatedCount})
                      </>
                    )}
                  </Button>
                )}
                <Tabs value={view} onValueChange={(v) => setView(v as 'map' | 'list')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="map" className="text-xs px-3">
                      <Map className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="list" className="text-xs px-3">
                      <List className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <MapFilters
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
              periodFilter={periodFilter}
              onPeriodFilterChange={setPeriodFilter}
              userFilter={userFilter}
              onUserFilterChange={setUserFilter}
              createdByFilter={createdByFilter}
              onCreatedByFilterChange={setCreatedByFilter}
              zoneFilter={zoneFilter}
              onZoneFilterChange={setZoneFilter}
              onClearFilters={handleClearFilters}
              totalCount={totalCount}
              filteredCount={filteredCount}
              geolocatedCount={geolocatedCount}
            />

            {/* Content based on view */}
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[500px] w-full" />
              </div>
            ) : view === 'map' ? (
              <ProspectMap
                prospects={filteredProspects}
                selectedProspectId={selectedProspect?.id}
                onProspectClick={handleProspectClick}
                height="500px"
              />
            ) : (
              <ProspectsTable
                prospects={filteredProspects}
                isLoading={isLoading}
                onView={handleViewProspect}
                onEdit={handleEditProspect}
                onDelete={handleDeleteProspect}
                selectedId={selectedProspect?.id}
                onSelect={handleProspectClick}
              />
            )}
          </CardContent>
        </Card>

        {/* Funnel and Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <ProspectFunnel />
          <ProspectActivityFeed 
            limit={8} 
            onProspectClick={(prospectId) => {
              const prospect = filteredProspects?.find(p => p.id === prospectId);
              if (prospect) {
                setSelectedProspect(prospect);
                setIsDetailsOpen(true);
              }
            }}
          />
        </div>

        {/* Prospect Form Modal */}
        <ProspectForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          prospect={editingProspect}
        />

        {/* Prospect Details Sheet */}
        <ProspectDetails
          prospectId={selectedProspect?.id || null}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onEdit={handleEditFromDetails}
        />
      </div>
    </AppLayout>
  );
};

export default CRM;
