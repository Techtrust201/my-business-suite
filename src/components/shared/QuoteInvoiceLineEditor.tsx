import { useMemo, useEffect } from 'react';
import { useFormContext, Controller, useWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  typeCount?: number; // Compteur par type (Article #1, Article #2, etc.)
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
  typeCount,
}: QuoteInvoiceLineEditorProps) {
  const { control, watch, setValue } = useFormContext();
  
  const line = watch(`lines.${index}`) as QuoteLineInput;
  const quantity = watch(`lines.${index}.quantity`) || 0;
  const unitPrice = watch(`lines.${index}.unit_price`) || 0;
  
  // Fonctions de calcul pour la synchronisation (arrondi à 2 décimales)
  const calculateDiscountAmount = (percent: number): number => {
    if (!percent || percent <= 0) return 0;
    const subtotal = quantity * unitPrice;
    return Math.round((subtotal * percent) / 100 * 100) / 100;
  };
  
  const calculateDiscountPercent = (amount: number): number => {
    if (!amount || amount <= 0) return 0;
    const subtotal = quantity * unitPrice;
    if (subtotal === 0) return 0;
    return Math.round((amount / subtotal) * 100 * 100) / 100;
  };
  
  const discountAmount = watch(`lines.${index}.discount_amount`) || 0;
  const discountPercent = watch(`lines.${index}.discount_percent`) || 0;
  const taxRate = watch(`lines.${index}.tax_rate`) || 0;
  
  const lineTotal = useMemo(() => {
    if (lineType === 'text' || lineType === 'section') {
      return 0;
    }
    return calculateLineTotal({
      ...line,
      quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_rate: taxRate,
    });
  }, [line, lineType, quantity, unitPrice, discountPercent, discountAmount, taxRate]);
  
  // Recalculer la remise en € si le % est défini et que quantity ou unitPrice change
  useEffect(() => {
    if (lineType === 'item' && line?.discount_percent && line.discount_percent > 0) {
      const amount = calculateDiscountAmount(line.discount_percent);
      const currentAmount = line.discount_amount || 0;
      // Ne mettre à jour que si la valeur a vraiment changé (éviter les boucles)
      if (Math.abs(amount - currentAmount) > 0.01) {
        setValue(`lines.${index}.discount_amount`, amount, { shouldValidate: false });
      }
    }
  }, [quantity, unitPrice, line?.discount_percent, lineType, index, setValue]);

  // Badges de type
  const typeBadges = {
    item: { label: 'Article', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🏷️' },
    text: { label: 'Texte libre', color: 'bg-green-100 text-green-800 border-green-200', icon: '📝' },
    section: { label: 'Section', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '📑' },
  };

  const badge = typeBadges[lineType];
  const displayCount = typeCount !== undefined ? typeCount : index + 1;

  // Composant d'en-tête de ligne
  const LineHeader = () => (
    <div className="flex items-center justify-between mb-3 pb-2 border-b">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Ligne {index + 1}
        </span>
        <Badge variant="outline" className={`${badge.color} border`}>
          <span className="mr-1">{badge.icon}</span>
          {badge.label} #{displayCount}
        </Badge>
      </div>
    </div>
  );

  // Pour les lignes de type texte ou section, afficher uniquement la description
  if (lineType === 'text' || lineType === 'section') {
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <LineHeader />
        <Controller
          control={control}
          name={`lines.${index}.description`}
          render={({ field }) => (
            <Textarea
              {...field}
              placeholder={lineType === 'section' ? 'Titre de la section' : 'Texte libre'}
              className="w-full min-h-[60px] resize-y"
              rows={2}
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
      <LineHeader />
      {/* Description */}
      <Controller
        control={control}
        name={`lines.${index}.description`}
        render={({ field, fieldState }) => (
          <div>
            <Textarea
              {...field}
              placeholder="Description de la prestation"
              className="w-full min-h-[60px] resize-y"
              rows={2}
            />
            {fieldState.error && (
              <p className="text-sm text-destructive mt-1">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />

      {/* Champs numériques en ligne */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Quantité
          </label>
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
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Prix unitaire HT
          </label>
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
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Remise %
          </label>
          <Controller
            control={control}
            name={`lines.${index}.discount_percent`}
            render={({ field }) => (
              <div className="relative">
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Remise %"
                  className="pr-6"
                  value={field.value || ''}
                  onChange={(e) => {
                    const percent = e.target.value ? Number(e.target.value) : 0;
                    field.onChange(percent);
                    // Synchroniser avec le montant en €
                    const amount = calculateDiscountAmount(percent);
                    setValue(`lines.${index}.discount_amount`, amount, { shouldValidate: false });
                  }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            )}
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Remise €
          </label>
          <Controller
            control={control}
            name={`lines.${index}.discount_amount`}
            render={({ field }) => (
              <div className="relative">
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Remise €"
                  className="pr-6"
                  value={field.value || ''}
                  onChange={(e) => {
                    const amount = e.target.value ? Number(e.target.value) : 0;
                    field.onChange(amount);
                    // Synchroniser avec le pourcentage
                    const percent = calculateDiscountPercent(amount);
                    setValue(`lines.${index}.discount_percent`, percent, { shouldValidate: false });
                  }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              </div>
            )}
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            TVA
          </label>
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
