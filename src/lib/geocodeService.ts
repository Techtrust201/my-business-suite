/**
 * Service de géocodage utilisant l'API Adresse du gouvernement français
 * https://adresse.data.gouv.fr/api-doc/adresse
 * 
 * Gratuit, sans clé API, limite de 50 requêtes/seconde
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  label: string;
  score: number;
  city: string;
  postcode: string;
}

export interface AddressSuggestion {
  label: string;
  city: string;
  postcode: string;
  street: string;
  housenumber: string;
  latitude: number;
  longitude: number;
}

const API_BASE_URL = 'https://api-adresse.data.gouv.fr';

/**
 * Géocode une adresse complète et retourne les coordonnées
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  postalCode?: string
): Promise<GeocodingResult | null> {
  try {
    const parts = [address, postalCode, city].filter(Boolean);
    const query = parts.join(' ');

    if (!query || query.length < 3) {
      return null;
    }

    const params = new URLSearchParams({
      q: query,
      limit: '1',
    });

    if (postalCode) {
      params.append('postcode', postalCode);
    }

    const response = await fetch(`${API_BASE_URL}/search/?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.geometry.coordinates;

    return {
      latitude,
      longitude,
      label: feature.properties.label,
      score: feature.properties.score,
      city: feature.properties.city || '',
      postcode: feature.properties.postcode || '',
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Recherche d'adresses avec auto-complétion
 */
export async function searchAddresses(
  query: string,
  limit: number = 5
): Promise<AddressSuggestion[]> {
  try {
    if (!query || query.length < 3) {
      return [];
    }

    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      type: 'housenumber', // Prioritize street addresses
    });

    const response = await fetch(`${API_BASE_URL}/search/?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Address search API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      return {
        label: feature.properties.label,
        city: feature.properties.city || '',
        postcode: feature.properties.postcode || '',
        street: feature.properties.street || '',
        housenumber: feature.properties.housenumber || '',
        latitude,
        longitude,
      };
    });
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
}

/**
 * Reverse geocoding - coordonnées vers adresse
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/reverse/?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];

    return {
      latitude,
      longitude,
      label: feature.properties.label,
      score: feature.properties.score,
      city: feature.properties.city || '',
      postcode: feature.properties.postcode || '',
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Récupère la position GPS actuelle de l'utilisateur
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // Cache pendant 1 minute
    });
  });
}
