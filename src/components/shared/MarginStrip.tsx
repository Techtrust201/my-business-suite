import { cn } from '@/lib/utils';

interface MarginStripProps {
  totalCost: number;
  totalSale: number;
  grossMargin: number;
  marginPercent: number;
  className?: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function MarginStrip({
  totalCost,
  totalSale,
  grossMargin,
  marginPercent,
  className,
}: MarginStripProps) {
  const isPositive = grossMargin >= 0;

  return (
    <div
      className={cn(
        'bg-slate-900 rounded-lg p-4 flex justify-between items-center',
        className
      )}
    >
      <div className="flex-1 text-center">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
          Coût d'achat
        </p>
        <p className="text-sm font-semibold font-mono text-white">
          {formatPrice(totalCost)}
        </p>
      </div>

      <div className="w-px h-8 bg-slate-700" />

      <div className="flex-1 text-center">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
          Prix de vente HT
        </p>
        <p className="text-sm font-semibold font-mono text-white">
          {formatPrice(totalSale)}
        </p>
      </div>

      <div className="w-px h-8 bg-slate-700" />

      <div className="flex-1 text-center">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
          Marge brute
        </p>
        <p
          className={cn(
            'text-sm font-semibold font-mono',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {formatPrice(grossMargin)}
        </p>
      </div>

      <div className="w-px h-8 bg-slate-700" />

      <div className="flex-1 text-center">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
          Marge %
        </p>
        <p
          className={cn(
            'text-sm font-semibold font-mono',
            isPositive ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {marginPercent.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
