import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { geocodeAddress, searchAddresses, type AddressSuggestion } from '@/lib/geocodeService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeocodeProspectParams {
  id: string;
  address_line1?: string | null;
  city?: string | null;
  postal_code?: string | null;
}

/**
 * Hook pour géocoder un prospect et mettre à jour ses coordonnées
 */
export function useGeocodeProspect() {
  return useMutation({
    mutationFn: async ({ id, address_line1, city, postal_code }: GeocodeProspectParams) => {
      if (!address_line1 && !city) {
        throw new Error('Adresse insuffisante pour le géocodage');
      }

      const result = await geocodeAddress(
        address_line1 || '',
        city || undefined,
        postal_code || undefined
      );

      if (!result) {
        throw new Error('Adresse non trouvée');
      }

      // Mettre à jour le prospect avec les coordonnées
      const { error } = await supabase
        .from('prospects')
        .update({
          latitude: result.latitude,
          longitude: result.longitude,
          geocoded_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      return result;
    },
    onError: (error) => {
      console.error('Geocoding failed:', error);
    },
  });
}

/**
 * Hook pour rechercher des adresses avec auto-complétion
 */
export function useAddressSearch() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchAddresses(query, 5);
      setSuggestions(results);
    } catch (error) {
      console.error('Address search failed:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isSearching,
    search,
    clear,
  };
}

/**
 * Hook pour géocoder plusieurs prospects en batch
 */
export function useBatchGeocode() {
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const geocodeBatch = useCallback(async (prospects: GeocodeProspectParams[]) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: prospects.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < prospects.length; i++) {
      const prospect = prospects[i];
      setProgress({ current: i + 1, total: prospects.length });

      try {
        const result = await geocodeAddress(
          prospect.address_line1 || '',
          prospect.city || undefined,
          prospect.postal_code || undefined
        );

        if (result) {
          await supabase
            .from('prospects')
            .update({
              latitude: result.latitude,
              longitude: result.longitude,
              geocoded_at: new Date().toISOString(),
            })
            .eq('id', prospect.id);

          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to geocode prospect ${prospect.id}:`, error);
        failCount++;
      }

      // Respecter la limite de 50 req/sec
      if (i < prospects.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    setIsProcessing(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} prospect(s) géocodé(s) avec succès`);
    }
    if (failCount > 0) {
      toast.warning(`${failCount} prospect(s) n'ont pas pu être géocodés`);
    }

    return { successCount, failCount };
  }, []);

  return {
    geocodeBatch,
    progress,
    isProcessing,
  };
}
