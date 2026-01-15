import { Search, Building2, Loader2, AlertCircle, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCompanySearch, CompanySearchResult } from '@/hooks/useCompanySearch';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CompanySearchProps {
  onSelect: (company: CompanySearchResult) => void;
}

export function CompanySearch({ onSelect }: CompanySearchProps) {
  const { query, setQuery, results, isLoading, error, helpMessage, clearSearch } = useCompanySearch();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open dropdown when there are results or when loading
  useEffect(() => {
    if (query.length >= 3 && (results.length > 0 || isLoading || error)) {
      setOpen(true);
    } else if (query.length < 3) {
      setOpen(false);
    }
  }, [query, results, isLoading, error]);

  const handleSelect = (company: CompanySearchResult) => {
    onSelect(company);
    setOpen(false);
    clearSearch();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="space-y-3">
      {/* Help block */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Vous pouvez rechercher votre client par son nom, SIREN ou SIRET</span>
        </p>
      </div>

      {/* Search input with dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={handleInputChange}
              placeholder="Rechercher votre client..."
              className="pl-9 pr-9"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {/* Help message for invalid format */}
              {helpMessage && (
                <div className="px-3 py-2 text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2 border-b">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{helpMessage}</span>
                </div>
              )}

              {/* Error state */}
              {error && !isLoading && (
                <div className="px-3 py-2 text-sm text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  Recherche en cours...
                </div>
              )}

              {/* No results */}
              {!isLoading && !error && query.length >= 3 && results.length === 0 && (
                <CommandEmpty className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Aucun résultat trouvé.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vous pouvez compléter la fiche manuellement.
                  </p>
                </CommandEmpty>
              )}

              {/* Results */}
              {!isLoading && results.length > 0 && (
                <CommandGroup>
                  {results.map((company) => (
                    <CommandItem
                      key={company.siret}
                      value={company.siret}
                      onSelect={() => handleSelect(company)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col gap-1 w-full py-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">
                            {company.nom_raison_sociale || company.nom_complet}
                          </span>
                          {company.libelle_nature_juridique && (
                            <Badge variant="secondary" className="text-xs">
                              {company.libelle_nature_juridique}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground ml-6">
                          <span className="font-mono">{company.siret}</span>
                          {company.siege.libelle_commune && (
                            <span>
                              {company.siege.code_postal} {company.siege.libelle_commune}
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
