import { useMemo, useEffect, useCallback } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { GripVertical, Copy, Trash2 } from 'lucide-react';
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
import { calculateLineTotal } from '@/hooks/useQuotes';
import type { QuoteLineInput } from '@/hooks/useQuotes';
import { cn } from '@/lib/utils';

interface TaxRate {
  id: string;
  rate: number;
  name?: string | null;
}

interface DragHandleProps {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
}

interface QuoteLineCardProps {
  index: number;
  canDelete: boolean;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  taxRates?: TaxRate[];
  defaultTaxRate: number;
  lineType?: 'item' | 'text' | 'section';
  typeCount?: number;
  dragHandleProps?: DragHandleProps;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

const typeBadges = {
  item: {
    label: 'Article',
    className: 'bg-primary/10 text-primary border-primary/20',
    icon: '🏷️',
  },
  text: {
    label: 'Texte libre',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    icon: '📝',
  },
  section: {
    label: 'Section',
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    icon: '📑',
  },
};

export function QuoteLineCard({
  index,
  canDelete,
  onDelete,
  onDuplicate,
  taxRates,
  defaultTaxRate,
  lineType = 'item',
  typeCount,
  dragHandleProps,
}: QuoteLineCardProps) {
  const { control, watch, setValue } = useFormContext();

  const line = watch(`lines.${index}`) as QuoteLineInput;
  const quantity = watch(`lines.${index}.quantity`) || 0;
  const unitPrice = watch(`lines.${index}.unit_price`) || 0;
  const discountAmount = watch(`lines.${index}.discount_amount`) || 0;
  const discountPercent = watch(`lines.${index}.discount_percent`) || 0;
  const taxRate = watch(`lines.${index}.tax_rate`) || 0;

  // Discount calculations
  const calculateDiscountAmount = useCallback((percent: number): number => {
    if (!percent || percent <= 0) return 0;
    const subtotal = quantity * unitPrice;
    return Math.round((subtotal * percent) / 100 * 100) / 100;
  }, [quantity, unitPrice]);

  const calculateDiscountPercent = useCallback((amount: number): number => {
    if (!amount || amount <= 0) return 0;
    const subtotal = quantity * unitPrice;
    if (subtotal === 0) return 0;
    return Math.round((amount / subtotal) * 100 * 100) / 100;
  }, [quantity, unitPrice]);

  const lineTotal = useMemo(() => {
    if (lineType === 'text' || lineType === 'section') return 0;
    return calculateLineTotal({
      ...line,
      quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_rate: taxRate,
    });
  }, [line, lineType, quantity, unitPrice, discountPercent, discountAmount, taxRate]);

  // Sync discount amount when percent changes
  useEffect(() => {
    if (lineType === 'item' && line?.discount_percent && line.discount_percent > 0) {
      const amount = calculateDiscountAmount(line.discount_percent);
      const currentAmount = line.discount_amount || 0;
      if (Math.abs(amount - currentAmount) > 0.01) {
        setValue(`lines.${index}.discount_amount`, amount, { shouldValidate: false });
      }
    }
  }, [quantity, unitPrice, line?.discount_percent, line?.discount_amount, lineType, index, setValue, calculateDiscountAmount]);

  const badge = typeBadges[lineType];
  const displayCount = typeCount !== undefined ? typeCount : index + 1;

  // Header with drag handle and actions
  const LineHeader = () => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground transition-colors touch-none"
          {...dragHandleProps?.attributes}
          {...dragHandleProps?.listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Badge variant="outline" className={cn('text-[10px] font-semibold', badge.className)}>
          <span className="mr-1">{badge.icon}</span>
          {badge.label} #{displayCount}
        </Badge>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="w-7 h-7 hover:bg-muted"
          onClick={() => onDuplicate(index)}
          title="Dupliquer"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="w-7 h-7 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(index)}
          disabled={!canDelete}
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  // Text or Section line (simple)
  if (lineType === 'text' || lineType === 'section') {
    return (
      <div className="border rounded-lg p-3 bg-card hover:border-primary/50 transition-colors">
        <LineHeader />
        <Controller
          control={control}
          name={`lines.${index}.description`}
          render={({ field }) => (
            <Textarea
              {...field}
              placeholder={lineType === 'section' ? 'Titre de la section' : 'Texte libre'}
              className="w-full min-h-[50px] resize-y text-sm"
              rows={2}
            />
          )}
        />
      </div>
    );
  }

  // Item line (full)
  return (
    <div className="border rounded-lg p-3 bg-card hover:border-primary/50 transition-colors">
      <LineHeader />

      {/* Description */}
      <Controller
        control={control}
        name={`lines.${index}.description`}
        render={({ field, fieldState }) => (
          <div className="mb-3">
            <Textarea
              {...field}
              placeholder="Description de la prestation"
              className="w-full min-h-[50px] resize-y text-sm"
              rows={2}
            />
            {fieldState.error && (
              <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>
            )}
          </div>
        )}
      />

      {/* Fields grid */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            Quantité <span className="text-destructive">*</span>
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
                  className="h-8 text-xs"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                />
                {fieldState.error && (
                  <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        </div>

        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            P.U. HT
          </label>
          <Controller
            control={control}
            name={`lines.${index}.unit_price`}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                step="0.01"
                min="0"
                placeholder="Prix"
                className="h-8 text-xs"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
              />
            )}
          />
        </div>

        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
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
                  placeholder="0"
                  className="h-8 text-xs pr-5"
                  value={field.value || ''}
                  onChange={(e) => {
                    const percent = e.target.value ? Number(e.target.value) : 0;
                    field.onChange(percent);
                    const amount = calculateDiscountAmount(percent);
                    setValue(`lines.${index}.discount_amount`, amount, { shouldValidate: false });
                  }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  %
                </span>
              </div>
            )}
          />
        </div>

        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
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
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="TVA" />
                </SelectTrigger>
                <SelectContent>
                  {taxRates?.filter((rate) => rate.rate !== undefined && rate.rate !== null).map((rate) => (
                    <SelectItem key={rate.id} value={`rate-${rate.rate}`} className="text-xs">
                      {rate.rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Line amount */}
      <div className="flex justify-end items-center mt-3 pt-2 border-t">
        <span className="text-xs text-muted-foreground mr-2">Montant HT</span>
        <span className="text-sm font-semibold font-mono">{formatPrice(lineTotal)}</span>
      </div>
    </div>
  );
}
