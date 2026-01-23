import { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Loader2, MapPin } from 'lucide-react';
import { useAddressAutocomplete, type AddressSuggestion } from '@/hooks/useAddressAutocomplete';
import { cn } from '@/lib/utils';

export interface AddressData {
  address_line1: string;
  postal_code: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: AddressData) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Rechercher une adresse...",
  disabled = false,
  className,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { suggestions, isLoading, searchAddresses, clearSuggestions } = useAddressAutocomplete();

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    searchAddresses(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  // Handle suggestion selection
  const handleSelect = (suggestion: AddressSuggestion) => {
    const addressData: AddressData = {
      address_line1: suggestion.name,
      postal_code: suggestion.postcode,
      city: suggestion.city,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    };
    
    onChange(suggestion.label);
    onSelect(addressData);
    setIsOpen(false);
    clearSuggestions();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        clearSuggestions();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show dropdown when we have suggestions
  useEffect(() => {
    if (suggestions.length > 0 && value.length >= 3) {
      setIsOpen(true);
    }
  }, [suggestions, value]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className={cn(
                "px-3 py-2 cursor-pointer transition-colors",
                index === highlightedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">{suggestion.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {suggestion.postcode} {suggestion.city}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
