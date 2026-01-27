import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, FileText, User, Globe, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DocumentOptionsSidebarProps {
  type: 'quote' | 'invoice';
  options: {
    language: string;
    showSignature: boolean;
    showConditions: boolean;
    showFreeField: boolean;
    showGlobalDiscount: boolean;
    documentTitle?: string;
    showDeliveryAddress?: boolean;
    showSirenSiret?: boolean;
    showVatNumber?: boolean;
  };
  onOptionsChange: (options: Partial<DocumentOptionsSidebarProps['options']>) => void;
}

export function DocumentOptionsSidebar({
  type,
  options,
  onOptionsChange,
}: DocumentOptionsSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCheckboxChange = (key: keyof DocumentOptionsSidebarProps['options'], checked: boolean) => {
    onOptionsChange({ [key]: checked });
  };

  return (
    <div className="border rounded-lg bg-muted/30">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Options</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Type de facturation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Type de facturation</span>
            </div>
            <div className="space-y-2 pl-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="billingType"
                  value="rapide"
                  className="w-4 h-4"
                  defaultChecked={false}
                />
                <span className="text-sm">Rapide</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="billingType"
                  value="complet"
                  className="w-4 h-4"
                  defaultChecked={true}
                />
                <span className="text-sm">Complet</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="billingType"
                  value="electronique"
                  className="w-4 h-4"
                  defaultChecked={false}
                />
                <span className="text-sm">Format électronique</span>
                <span className="text-xs text-muted-foreground">ℹ️</span>
              </label>
            </div>
          </div>

          <Separator />

          {/* Client */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Client</span>
            </div>
            <div className="space-y-2 pl-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showDeliveryAddress || false}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('showDeliveryAddress', checked === true)
                  }
                />
                <span className="text-sm">Adresse de livraison</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showSirenSiret || false}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('showSirenSiret', checked === true)
                  }
                />
                <span className="text-sm">SIREN ou SIRET</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showVatNumber || false}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('showVatNumber', checked === true)
                  }
                />
                <span className="text-sm">N° de TVA intracommunautaire</span>
              </label>
            </div>
          </div>

          <Separator />

          {/* Langue */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>Langue</span>
            </div>
            <div className="pl-6">
              <Select
                value={options.language || 'fr'}
                onValueChange={(value) => onOptionsChange({ language: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une langue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Info complémentaires */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <List className="h-4 w-4 text-muted-foreground" />
              <span>Info complémentaires</span>
            </div>
            <div className="space-y-2 pl-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showConditions}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('showConditions', checked === true)
                  }
                />
                <span className="text-sm">Conditions d'acceptation</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showSignature}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('showSignature', checked === true)
                  }
                />
                <span className="text-sm">Champ signature</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={!!options.documentTitle}
                  onCheckedChange={(checked) =>
                    onOptionsChange({ documentTitle: checked ? 'Document' : undefined })
                  }
                />
                <span className="text-sm">Intitulé du document</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showFreeField}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('showFreeField', checked === true)
                  }
                />
                <span className="text-sm">Champ libre</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showGlobalDiscount}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('showGlobalDiscount', checked === true)
                  }
                />
                <span className="text-sm">Remise globale</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
