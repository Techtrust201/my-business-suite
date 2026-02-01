import { FileText, Download, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuoteFormTopbarProps {
  title: string;
  subtitle?: string;
  isEditing: boolean;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onExport?: () => void;
}

export function QuoteFormTopbar({
  title,
  subtitle,
  isEditing,
  isLoading,
  onClose,
  onSubmit,
  onExport,
}: QuoteFormTopbarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
          <FileText className="w-[18px] h-[18px] text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-[15px] text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onExport && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exporter
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          onClick={onSubmit}
          disabled={isLoading}
          className="text-xs shadow-sm"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 mr-1.5" />
          )}
          {isEditing ? 'Enregistrer' : 'Créer le devis'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="w-8 h-8 rounded-full border"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
