import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ProspectWithStatus } from '@/hooks/useProspects';

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

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current.clear();

    // Add new markers
    geolocatedProspects.forEach((prospect) => {
      const color = prospect.status?.color || '#6B7280';
      const isSelected = prospect.id === selectedProspectId;
      const icon = isSelected ? createSelectedIcon(color) : createColoredIcon(color);

      const marker = L.marker([prospect.latitude!, prospect.longitude!], { icon })
        .addTo(map);

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

      markersRef.current.set(prospect.id, marker);
    });

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

  return (
    <div
      ref={mapContainerRef}
      style={{ height }}
      className={`rounded-lg border overflow-hidden ${className}`}
    />
  );
}
