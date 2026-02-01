import { cn } from '@/lib/utils';

interface SummaryCardProps {
  total: number;
  lineCount: number;
  hasGlobalDiscount?: boolean;
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

export function SummaryCard({
  total,
  lineCount,
  hasGlobalDiscount = false,
  className,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 flex justify-between items-center border border-primary/20',
        className
      )}
    >
      <div>
        <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">
          Total estimé
        </p>
        <p className="text-xl font-bold font-mono text-primary">
          {formatPrice(total)}
        </p>
      </div>
      <div className="text-right text-sm text-muted-foreground">
        <p>
          {lineCount} article{lineCount !== 1 ? 's' : ''}
        </p>
        {hasGlobalDiscount && (
          <p className="text-xs">Remise globale activée</p>
        )}
      </div>
    </div>
  );
}
