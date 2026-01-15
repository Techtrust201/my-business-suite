import { useState, useCallback, useRef, useEffect } from 'react';

export interface CompanySearchResult {
  siren: string;
  siret: string;
  nom_complet: string;
  nom_raison_sociale: string;
  nature_juridique: string;
  libelle_nature_juridique: string;
  activite_principale: string;
  siege: {
    adresse: string;
    code_postal: string;
    libelle_commune: string;
    complement_adresse: string | null;
  };
}

interface APIResponse {
  results: Array<{
    siren: string;
    siege: {
      siret: string;
      adresse: string;
      code_postal: string;
      libelle_commune: string;
      complement_adresse: string | null;
    };
    nom_complet: string;
    nom_raison_sociale: string;
    nature_juridique: string;
    libelle_nature_juridique: string;
    activite_principale: string;
  }>;
  total_results: number;
}

type SearchType = 'text' | 'siren' | 'siret' | 'invalid';

// Cache for results
const cache = new Map<string, { data: CompanySearchResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function detectSearchType(query: string): SearchType {
  const cleaned = query.replace(/\s/g, '');
  
  if (/^\d{9}$/.test(cleaned)) {
    return 'siren';
  }
  if (/^\d{14}$/.test(cleaned)) {
    return 'siret';
  }
  if (/^\d+$/.test(cleaned) && cleaned.length !== 9 && cleaned.length !== 14) {
    return 'invalid';
  }
  return 'text';
}

function getSearchTypeHelp(query: string): string | null {
  const cleaned = query.replace(/\s/g, '');
  
  if (/^\d+$/.test(cleaned) && cleaned.length > 0 && cleaned.length !== 9 && cleaned.length !== 14) {
    return 'Un SIREN contient 9 chiffres, un SIRET contient 14 chiffres.';
  }
  return null;
}

export function useCompanySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpMessage, setHelpMessage] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchCompanies = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    
    // Clear previous state
    setError(null);
    setHelpMessage(null);
    
    // Check for minimum length
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }

    // Check for help message
    const help = getSearchTypeHelp(trimmed);
    if (help) {
      setHelpMessage(help);
    }

    // Detect search type
    const searchType = detectSearchType(trimmed);
    if (searchType === 'invalid') {
      setResults([]);
      return;
    }

    // Check cache
    const cacheKey = trimmed.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setResults(cached.data);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const url = new URL('https://recherche-entreprises.api.gouv.fr/search');
      url.searchParams.set('q', trimmed);
      url.searchParams.set('per_page', '10');
      url.searchParams.set('page', '1');

      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }

      const data: APIResponse = await response.json();

      const mappedResults: CompanySearchResult[] = data.results.map((item) => ({
        siren: item.siren,
        siret: item.siege.siret,
        nom_complet: item.nom_complet,
        nom_raison_sociale: item.nom_raison_sociale || item.nom_complet,
        nature_juridique: item.nature_juridique,
        libelle_nature_juridique: item.libelle_nature_juridique || '',
        activite_principale: item.activite_principale || '',
        siege: {
          adresse: item.siege.adresse || '',
          code_postal: item.siege.code_postal || '',
          libelle_commune: item.siege.libelle_commune || '',
          complement_adresse: item.siege.complement_adresse,
        },
      }));

      // Update cache
      cache.set(cacheKey, { data: mappedResults, timestamp: Date.now() });
      setResults(mappedResults);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      setError('Impossible de rechercher. Veuillez réessayer ou saisir manuellement.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchCompanies(query);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, searchCompanies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setHelpMessage(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    helpMessage,
    clearSearch,
  };
}
