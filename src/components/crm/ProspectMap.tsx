import { useEffect, useRef, useMemo, useState } from 'react';
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
  
  // State for cluster popup dialog
  const [clusterProspects, setClusterProspects] = useState<ProspectWithStatus[]>([]);
  const [isClusterDialogOpen, setIsClusterDialogOpen] = useState(false);

  // Filter prospects with coordinates
  const geolocatedProspects = useMemo(() => {
    return prospects.filter(
      (p) => p.latitude !== null && p.longitude !== null
    );
  }, [prospects]);

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

  // Update markers when prospects change
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
      const prospectIds = childMarkers.map(marker => (marker as any).prospectId);
      const clusterData = geolocatedProspects.filter(p => prospectIds.includes(p.id));
      
      setClusterProspects(clusterData);
      setIsClusterDialogOpen(true);
    });

    // Add new markers
    geolocatedProspects.forEach((prospect) => {
      const color = prospect.status?.color || '#6B7280';
      const isSelected = prospect.id === selectedProspectId;
      const icon = isSelected ? createSelectedIcon(color) : createColoredIcon(color);

      const marker = L.marker([prospect.latitude!, prospect.longitude!], { icon });
      
      // Store prospect ID on marker for cluster click handling
      (marker as any).prospectId = prospect.id;

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
  }, [geolocatedProspects, selectedProspectId, onProspectClick]);

  // Center on selected prospect
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProspectId) return;

    const prospect = geolocatedProspects.find((p) => p.id === selectedProspectId);
    if (prospect && prospect.latitude && prospect.longitude) {
      map.setView([prospect.latitude, prospect.longitude], 14, { animate: true });
      
      const marker = markersRef.current.get(prospect.id);
      if (marker) {
        marker.openPopup();
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
        style={{ height }}
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
