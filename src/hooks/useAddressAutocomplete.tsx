import { useState, useCallback } from 'react';
import { useDebouncedCallback } from './useDebouncedCallback';

export interface AddressSuggestion {
  id: string;
  label: string;
  name: string;
  housenumber?: string;
  street?: string;
  postcode: string;
  city: string;
  context: string;
  latitude: number;
  longitude: number;
}

interface ApiFeature {
  properties: {
    id: string;
    label: string;
    name: string;
    housenumber?: string;
    street?: string;
    postcode: string;
    city: string;
    context: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface ApiResponse {
  features: ApiFeature[];
}

export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAddresses = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche d\'adresse');
      }

      const data: ApiResponse = await response.json();

      const formattedSuggestions: AddressSuggestion[] = data.features.map((feature) => ({
        id: feature.properties.id,
        label: feature.properties.label,
        name: feature.properties.name,
        housenumber: feature.properties.housenumber,
        street: feature.properties.street,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
        context: feature.properties.context,
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      }));

      setSuggestions(formattedSuggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useDebouncedCallback(searchAddresses, 300);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    searchAddresses: debouncedSearch,
    clearSuggestions,
  };
}
