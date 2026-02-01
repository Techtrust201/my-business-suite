import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { ProspectWithStatus } from '@/hooks/useProspects';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Building2 } from 'lucide-react';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ProspectMapProps {
  prospects: ProspectWithStatus[];
  selectedProspectId?: string | null;
  onProspectClick?: (prospect: ProspectWithStatus) => void;
  height?: string;
  className?: string;
}

// Create a custom colored marker
function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

// Selected marker with larger size
function createSelectedIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker-selected',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 8px rgba(0,0,0,0.4);
        animation: pulse 1.5s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

// Stacked marker icon for overlapping points
function createStackedIcon(color: string, count: number): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker-stacked',
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 24px;
          height: 24px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: -6px;
          right: -2px;
          min-width: 18px;
          height: 18px;
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%);
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">+${count}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

// Custom cluster icon showing +N
function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  let size = 40;
  let fontSize = 14;
  
  if (count >= 100) {
    size = 50;
    fontSize = 12;
  } else if (count >= 10) {
    size = 45;
    fontSize = 13;
  }
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: ${fontSize}px;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        +${count}
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

export function ProspectMap({
  prospects,
  selectedProspectId,
  onProspectClick,
  height = '500px',
  className = '',
}: ProspectMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const previousSelectedRef = useRef<string | null>(null);
  
  // State for cluster popup dialog
  const [clusterProspects, setClusterProspects] = useState<ProspectWithStatus[]>([]);
  const [isClusterDialogOpen, setIsClusterDialogOpen] = useState(false);

  // Filter prospects with coordinates
  const geolocatedProspects = useMemo(() => {
    return prospects.filter(
      (p) => p.latitude !== null && p.longitude !== null
    );
  }, [prospects]);

  // Group prospects by position (to handle overlapping points)
  const groupedByPosition = useMemo(() => {
    const groups = new Map<string, ProspectWithStatus[]>();
    geolocatedProspects.forEach(p => {
      // Round to 5 decimals for tolerance (about 1 meter precision)
      const key = `${p.latitude!.toFixed(5)},${p.longitude!.toFixed(5)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return groups;
  }, [geolocatedProspects]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center on France
    const map = L.map(mapContainerRef.current, {
      center: [46.603354, 1.888334], // Center of France
      zoom: 6,
      scrollWheelZoom: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle opening the dialog for stacked/grouped prospects
  const handleStackedClick = useCallback((prospects: ProspectWithStatus[]) => {
    setClusterProspects(prospects);
    setIsClusterDialogOpen(true);
  }, []);

  // Update markers when prospects change (NOT when selection changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current.clear();

    // Create new marker cluster group with custom icon
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false, // We handle click ourselves
      disableClusteringAtZoom: 16,
    });

    // Handle cluster click to show list of prospects
    clusterGroup.on('clusterclick', (e: L.LeafletEvent) => {
      const cluster = e.propagatedFrom as L.MarkerCluster;
      const childMarkers = cluster.getAllChildMarkers();
      
      // Get prospect data from markers
      const prospectIds = childMarkers.flatMap(marker => (marker as any).prospectIds || [(marker as any).prospectId]);
      const clusterData = geolocatedProspects.filter(p => prospectIds.includes(p.id));
      
      setClusterProspects(clusterData);
      setIsClusterDialogOpen(true);
    });

    // Process each unique position
    groupedByPosition.forEach((prospectsAtPosition, positionKey) => {
      const [lat, lng] = positionKey.split(',').map(Number);
      const firstProspect = prospectsAtPosition[0];
      
      if (prospectsAtPosition.length === 1) {
        // Single prospect at this location - create normal marker
        const prospect = firstProspect;
        const color = prospect.status?.color || '#6B7280';
        const icon = createColoredIcon(color);

        const marker = L.marker([lat, lng], { icon });
        
        // Store prospect ID on marker for cluster click handling
        (marker as any).prospectId = prospect.id;
        (marker as any).prospectIds = [prospect.id];

        // Create popup content
        const popupContent = `
          <div style="min-width: 180px;">
            <strong style="font-size: 14px;">${prospect.company_name}</strong>
            ${prospect.status ? `
              <div style="margin-top: 4px;">
                <span style="
                  display: inline-block;
                  padding: 2px 8px;
                  border-radius: 9999px;
                  font-size: 12px;
                  color: white;
                  background-color: ${prospect.status.color};
                ">${prospect.status.name}</span>
              </div>
            ` : ''}
            ${prospect.city ? `<div style="margin-top: 4px; color: #666; font-size: 12px;">${prospect.postal_code || ''} ${prospect.city}</div>` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onProspectClick) {
            onProspectClick(prospect);
          }
        });

        clusterGroup.addLayer(marker);
        markersRef.current.set(prospect.id, marker);
      } else {
        // Multiple prospects at same location - create stacked marker
        const color = firstProspect.status?.color || '#6B7280';
        const icon = createStackedIcon(color, prospectsAtPosition.length);

        const marker = L.marker([lat, lng], { icon });
        
        // Store all prospect IDs on marker
        (marker as any).prospectIds = prospectsAtPosition.map(p => p.id);

        marker.on('click', () => {
          handleStackedClick(prospectsAtPosition);
        });

        clusterGroup.addLayer(marker);
        
        // Store marker reference for all prospects at this location
        prospectsAtPosition.forEach(p => {
          markersRef.current.set(p.id, marker);
        });
      }
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Fit bounds if we have prospects
    if (geolocatedProspects.length > 0) {
      const bounds = L.latLngBounds(
        geolocatedProspects.map((p) => [p.latitude!, p.longitude!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [geolocatedProspects, groupedByPosition, onProspectClick, handleStackedClick]);

  // Update marker icons when selection changes (without recreating all markers)
  useEffect(() => {
    // Update previous selected marker to normal icon
    if (previousSelectedRef.current && previousSelectedRef.current !== selectedProspectId) {
      const prevMarker = markersRef.current.get(previousSelectedRef.current);
      const prevProspect = geolocatedProspects.find(p => p.id === previousSelectedRef.current);
      
      if (prevMarker && prevProspect) {
        // Check if this marker is for stacked prospects
        const prospectIds = (prevMarker as any).prospectIds as string[] | undefined;
        if (prospectIds && prospectIds.length > 1) {
          // It's a stacked marker, restore stacked icon
          const color = prevProspect.status?.color || '#6B7280';
          prevMarker.setIcon(createStackedIcon(color, prospectIds.length));
        } else {
          // Single marker, restore normal icon
          const color = prevProspect.status?.color || '#6B7280';
          prevMarker.setIcon(createColoredIcon(color));
        }
      }
    }

    // Update new selected marker to selected icon
    if (selectedProspectId) {
      const marker = markersRef.current.get(selectedProspectId);
      const prospect = geolocatedProspects.find(p => p.id === selectedProspectId);
      
      if (marker && prospect) {
        const color = prospect.status?.color || '#6B7280';
        marker.setIcon(createSelectedIcon(color));
      }
    }

    previousSelectedRef.current = selectedProspectId || null;
  }, [selectedProspectId, geolocatedProspects]);

  // Center on selected prospect
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProspectId) return;

    const prospect = geolocatedProspects.find((p) => p.id === selectedProspectId);
    if (prospect && prospect.latitude && prospect.longitude) {
      map.setView([prospect.latitude, prospect.longitude], 14, { animate: true });
      
      const marker = markersRef.current.get(prospect.id);
      if (marker) {
        // Only open popup for single markers, not stacked ones
        const prospectIds = (marker as any).prospectIds as string[] | undefined;
        if (!prospectIds || prospectIds.length === 1) {
          marker.openPopup();
        }
      }
    }
  }, [selectedProspectId, geolocatedProspects]);

  const handleSelectFromCluster = (prospect: ProspectWithStatus) => {
    setIsClusterDialogOpen(false);
    if (onProspectClick) {
      onProspectClick(prospect);
    }
  };

  return (
    <>
      <div
        ref={mapContainerRef}
        style={{ height, zIndex: 0 }}
        className={`rounded-lg border overflow-hidden ${className}`}
      />
      
      {/* Cluster Dialog - Shows list of prospects in cluster */}
      <Dialog open={isClusterDialogOpen} onOpenChange={setIsClusterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {clusterProspects.length} entreprises dans cette zone
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {clusterProspects.map((prospect) => (
                <div
                  key={prospect.id}
                  onClick={() => handleSelectFromCluster(prospect)}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: prospect.status?.color || '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">{prospect.company_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {prospect.postal_code} {prospect.city}
                    </div>
                  </div>
                  {prospect.status && (
                    <Badge 
                      variant="secondary" 
                      className="flex-shrink-0"
                      style={{ 
                        backgroundColor: `${prospect.status.color}20`, 
                        color: prospect.status.color,
                        borderColor: prospect.status.color
                      }}
                    >
                      {prospect.status.name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
