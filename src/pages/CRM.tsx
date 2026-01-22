import { useState, useMemo, useDeferredValue } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Map, List, RefreshCw, Settings, MapPin } from 'lucide-react';
import { ProspectMap } from '@/components/crm/ProspectMap';
import { MapFilters } from '@/components/crm/MapFilters';
import { ProspectsTable } from '@/components/crm/ProspectsTable';
import { ProspectForm } from '@/components/crm/ProspectForm';
import { ProspectDetails } from '@/components/crm/ProspectDetails';
import { useProspects, type ProspectWithStatus } from '@/hooks/useProspects';
import { useInitProspectStatuses, useProspectStatuses } from '@/hooks/useProspectStatuses';
import { useBatchGeocode } from '@/hooks/useGeocoding';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CRM = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  
  const [selectedProspect, setSelectedProspect] = useState<ProspectWithStatus | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<ProspectWithStatus | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: statuses, isLoading: isLoadingStatuses } = useProspectStatuses();
  const initStatuses = useInitProspectStatuses();
  const { geocodeBatch, isProcessing: isGeocoding, progress } = useBatchGeocode();

  // Build query options
  const queryOptions = useMemo(() => ({
    statusId: statusFilter !== 'all' ? statusFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    search: deferredSearch || undefined,
  }), [statusFilter, sourceFilter, deferredSearch]);

  const { data: prospects, isLoading } = useProspects(queryOptions);

  // Calculate counts
  const totalCount = prospects?.length || 0;
  const geolocatedCount = prospects?.filter(p => p.latitude && p.longitude).length || 0;

  // Check if statuses need initialization
  const needsStatusInit = !isLoadingStatuses && (!statuses || statuses.length === 0);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSourceFilter('all');
    setSearchQuery('');
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

  const handleGeocodeAll = async () => {
    if (!prospects) return;
    
    const prospectsToGeocode = prospects.filter(
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
                {geolocatedCount < totalCount && totalCount > 0 && (
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
                        Géocoder tout ({totalCount - geolocatedCount})
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
              onClearFilters={handleClearFilters}
              totalCount={totalCount}
              filteredCount={totalCount}
              geolocatedCount={geolocatedCount}
            />

            {/* Content based on view */}
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[500px] w-full" />
              </div>
            ) : view === 'map' ? (
              <ProspectMap
                prospects={prospects || []}
                selectedProspectId={selectedProspect?.id}
                onProspectClick={handleProspectClick}
                height="500px"
              />
            ) : (
              <ProspectsTable
                prospects={prospects || []}
                isLoading={isLoading}
                onView={handleViewProspect}
                onEdit={handleEditProspect}
                selectedId={selectedProspect?.id}
                onSelect={handleProspectClick}
              />
            )}
          </CardContent>
        </Card>

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
