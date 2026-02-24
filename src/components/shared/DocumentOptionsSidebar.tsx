import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Settings, FileText, User, Globe, List, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useDefaultBankAccount } from '@/hooks/useBankAccounts';

interface DocumentOptionsSidebarProps {
  type: 'quote' | 'invoice';
  options: {
    language: string;
    showSignature: boolean;
    showConditions: boolean;
    showFreeField: boolean;
    showGlobalDiscount: boolean;
    globalDiscountPercent?: number;
    globalDiscountAmount?: number;
    documentTitle?: string;
    showDeliveryAddress?: boolean;
    showSirenSiret?: boolean;
    showVatNumber?: boolean;
    conditionsText?: string;
    freeFieldContent?: string;
    showPaymentMethod?: boolean;
    paymentMethodText?: string;
  };
  onOptionsChange: (options: Partial<DocumentOptionsSidebarProps['options']>) => void;
  onConditionsChange?: (text: string) => void; // Callback pour synchroniser avec le formulaire
}

export function DocumentOptionsSidebar({
  type,
  options,
  onOptionsChange,
  onConditionsChange,
}: DocumentOptionsSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: defaultBankAccount } = useDefaultBankAccount();

  // Fonction pour formater les informations bancaires depuis le compte bancaire par défaut
  const formatBankInfo = (): string => {
    if (!defaultBankAccount) return '';
    
    const parts: string[] = [];
    if (defaultBankAccount.iban) {
      parts.push(`IBAN: ${defaultBankAccount.iban}`);
    }
    if (defaultBankAccount.bic) {
      parts.push(`BIC: ${defaultBankAccount.bic}`);
    }
    if (defaultBankAccount.account_holder) {
      parts.push(`Titulaire: ${defaultBankAccount.account_holder}`);
    }
    if (defaultBankAccount.bank_name) {
      parts.push(`Banque: ${defaultBankAccount.bank_name}`);
    }
    return parts.join('\n');
  };

  // Pré-remplir le champ moyen de paiement avec les informations bancaires si disponible et si le champ est vide
  useEffect(() => {
    if (options.showPaymentMethod && !options.paymentMethodText && defaultBankAccount) {
      const bankInfo = formatBankInfo();
      if (bankInfo) {
        onOptionsChange({ paymentMethodText: bankInfo });
      }
    }
  }, [options.showPaymentMethod, defaultBankAccount]);

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
                <span className="text-sm">Conditions de paiement</span>
              </label>
              {options.showConditions && (
                <div className="pl-6 mt-2 space-y-2">
                  <Textarea
                    placeholder="Saisissez vos Conditions de paiement..."
                    value={options.conditionsText || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      onOptionsChange({ conditionsText: text });
                      // Synchroniser avec le champ "terms" du formulaire si callback fourni
                      if (onConditionsChange) {
                        onConditionsChange(text);
                      }
                    }}
                    className="w-full min-h-[100px] resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ces conditions seront affichées dans l'aperçu du document
                  </p>
                </div>
              )}
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
              {options.documentTitle && (
                <div className="pl-6 mt-2">
                  <Textarea
                    placeholder="Ex: Devis de prestation"
                    value={options.documentTitle || 'Document'}
                    onChange={(e) => onOptionsChange({ documentTitle: e.target.value || 'Document' })}
                    className="w-full min-h-[60px] resize-y"
                    rows={2}
                  />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showFreeField}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('showFreeField', checked === true)
                  }
                />
                <span className="text-sm">Champ libre</span>
              </label>
              {options.showFreeField && (
                <div className="pl-6 mt-2 space-y-2">
                  <Textarea
                    placeholder="Saisissez le contenu du champ libre..."
                    value={options.freeFieldContent || ''}
                    onChange={(e) =>
                      onOptionsChange({ freeFieldContent: e.target.value })
                    }
                    className="w-full min-h-[100px] resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ce contenu sera affiché dans l'aperçu du document
                  </p>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showGlobalDiscount}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange('showGlobalDiscount', checked === true)
                  }
                />
                <span className="text-sm">Remise globale</span>
              </label>
              {options.showGlobalDiscount && (
                <div className="pl-6 space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="%"
                      value={options.globalDiscountPercent || ''}
                      onChange={(e) =>
                        onOptionsChange({
                          globalDiscountPercent: e.target.value ? parseFloat(e.target.value) : 0,
                          globalDiscountAmount: 0, // Réinitialiser le montant si on utilise le pourcentage
                        })
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">ou</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Montant €"
                      value={options.globalDiscountAmount || ''}
                      onChange={(e) =>
                        onOptionsChange({
                          globalDiscountAmount: e.target.value ? parseFloat(e.target.value) : 0,
                          globalDiscountPercent: 0, // Réinitialiser le pourcentage si on utilise le montant
                        })
                      }
                      className="w-32"
                    />
                  </div>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={options.showPaymentMethod || false}
                  onCheckedChange={(checked) => {
                    handleCheckboxChange('showPaymentMethod', checked === true);
                    // Si on active et que le champ est vide, pré-remplir avec les infos bancaires
                    if (checked && !options.paymentMethodText) {
                      const bankInfo = formatBankInfo();
                      if (bankInfo) {
                        onOptionsChange({ paymentMethodText: bankInfo });
                      }
                    }
                  }}
                />
                <span className="text-sm">Moyen de paiement</span>
              </label>
              {options.showPaymentMethod && (
                <div className="pl-6 mt-2 space-y-2">
                  <Textarea
                    placeholder="Saisissez les informations de paiement (IBAN, BIC, etc.)..."
                    value={options.paymentMethodText || ''}
                    onChange={(e) =>
                      onOptionsChange({ paymentMethodText: e.target.value })
                    }
                    className="w-full min-h-[100px] resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ces informations seront affichées dans l'aperçu et le PDF du document
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
