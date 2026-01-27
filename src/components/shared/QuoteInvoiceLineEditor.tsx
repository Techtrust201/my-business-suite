import { useMemo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Trash2 } from 'lucide-react';
import { calculateLineTotal } from '@/hooks/useQuotes';
import type { QuoteLineInput } from '@/hooks/useQuotes';

interface TaxRate {
  id: string;
  rate: number;
  name?: string | null;
}

interface QuoteInvoiceLineEditorProps {
  index: number;
  canDelete: boolean;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  taxRates?: TaxRate[];
  defaultTaxRate: number;
  lineType?: 'item' | 'text' | 'section';
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function QuoteInvoiceLineEditor({
  index,
  canDelete,
  onDelete,
  onDuplicate,
  taxRates,
  defaultTaxRate,
  lineType = 'item',
}: QuoteInvoiceLineEditorProps) {
  const { control, watch } = useFormContext();
  
  const line = watch(`lines.${index}`) as QuoteLineInput;
  
  const lineTotal = useMemo(() => {
    if (lineType === 'text' || lineType === 'section') {
      return 0;
    }
    return calculateLineTotal(line);
  }, [line, lineType]);

  // Pour les lignes de type texte ou section, afficher uniquement la description
  if (lineType === 'text' || lineType === 'section') {
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <Controller
          control={control}
          name={`lines.${index}.description`}
          render={({ field }) => (
            <Input
              {...field}
              placeholder={lineType === 'section' ? 'Titre de la section' : 'Texte libre'}
              className="w-full"
            />
          )}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(index)}
          >
            <Copy className="h-4 w-4 mr-2" />
            Dupliquer
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(index)}
            disabled={!canDelete}
          >
            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
            Supprimer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      {/* Description */}
      <Controller
        control={control}
        name={`lines.${index}.description`}
        render={({ field, fieldState }) => (
          <div>
            <Input
              {...field}
              placeholder="Description de la prestation"
              className="w-full"
            />
            {fieldState.error && (
              <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />

      {/* Champs numériques en ligne */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Controller
          control={control}
          name={`lines.${index}.quantity`}
          render={({ field, fieldState }) => (
            <div>
              <Input
                {...field}
                type="number"
                step="0.01"
                min="0"
                placeholder="Qté"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
        
        <Controller
          control={control}
          name={`lines.${index}.unit_price`}
          render={({ field, fieldState }) => (
            <div>
              <Input
                {...field}
                type="number"
                step="0.01"
                min="0"
                placeholder="Prix HT"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
              />
              {fieldState.error && (
                <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
        
        <Controller
          control={control}
          name={`lines.${index}.discount_percent`}
          render={({ field }) => (
            <div className="relative">
              <Input
                {...field}
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="Remise"
                className="pr-6"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          )}
        />
        
        <Controller
          control={control}
          name={`lines.${index}.tax_rate`}
          render={({ field }) => (
            <Select
              onValueChange={(val) => field.onChange(Number(val.replace('rate-', '')))}
              value={field.value !== undefined && field.value !== null ? `rate-${field.value}` : `rate-${defaultTaxRate}`}
            >
              <SelectTrigger>
                <SelectValue placeholder="TVA" />
              </SelectTrigger>
              <SelectContent>
                {taxRates?.filter(rate => rate.rate !== undefined && rate.rate !== null).map((rate) => (
                  <SelectItem key={rate.id} value={`rate-${rate.rate}`}>
                    {rate.rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Montant calculé */}
      {lineTotal > 0 && (
        <div className="text-sm text-muted-foreground font-medium">
          Montant HT: <span className="font-mono">{formatPrice(lineTotal)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDuplicate(index)}
        >
          <Copy className="h-4 w-4 mr-2" />
          Dupliquer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(index)}
          disabled={!canDelete}
        >
          <Trash2 className="h-4 w-4 mr-2 text-destructive" />
          Supprimer
        </Button>
      </div>
    </div>
  );
}
