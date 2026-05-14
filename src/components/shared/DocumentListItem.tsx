import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DocumentListItemProps {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  amount?: ReactNode;
  secondaryAmount?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DocumentListItem({
  title,
  subtitle,
  meta,
  amount,
  secondaryAmount,
  status,
  actions,
  onClick,
  className,
}: DocumentListItemProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 text-left"
        >
          <div className="truncate text-base font-semibold text-primary">{title}</div>
          {subtitle && <div className="mt-1 truncate text-sm text-foreground">{subtitle}</div>}
          {meta && <div className="mt-1 text-xs text-muted-foreground">{meta}</div>}
        </button>
        <div className="shrink-0">{actions}</div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="space-y-1">
          {status && <div>{status}</div>}
          {secondaryAmount && <div className="text-xs text-muted-foreground">{secondaryAmount}</div>}
        </div>
        {amount && <div className="text-right text-lg font-semibold tabular-nums">{amount}</div>}
      </div>
    </div>
  );
}
