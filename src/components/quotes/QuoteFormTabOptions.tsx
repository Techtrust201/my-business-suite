import { useFormContext } from 'react-hook-form';
import { Settings, User, FileText, List } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

interface DocumentOptions {
  showSignature: boolean;
  showConditions: boolean;
  showFreeField: boolean;
  showGlobalDiscount: boolean;
  globalDiscountPercent: number;
  globalDiscountAmount: number;
  documentTitle?: string;
  showDeliveryAddress?: boolean;
  showSirenSiret?: boolean;
  showVatNumber?: boolean;
  conditionsText?: string;
  freeFieldContent?: string;
  showPaymentMethod?: boolean;
  paymentMethodText?: string;
}

interface QuoteFormTabOptionsProps {
  options: DocumentOptions;
  onOptionsChange: (options: Partial<DocumentOptions>) => void;
}

export function QuoteFormTabOptions({
  options,
  onOptionsChange,
}: QuoteFormTabOptionsProps) {
  const form = useFormContext();

  const handleCheckboxChange = (key: keyof DocumentOptions, checked: boolean) => {
    onOptionsChange({ [key]: checked });
  };

  return (
    <div className="space-y-6">
      {/* Section: Options du document */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Settings className="w-4 h-4" />
          <span>Options du document</span>
        </div>

        <div className="space-y-3 pl-1">
          {/* Conditions */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={options.showConditions}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('showConditions', checked === true)
                }
              />
              <div>
                <span className="text-sm font-medium">Conditions d'acceptation</span>
                <p className="text-xs text-muted-foreground">Affichées au bas du devis</p>
              </div>
            </label>
            {options.showConditions && (
              <div className="ml-8">
                <Textarea
                  placeholder="Saisissez vos conditions..."
                  value={options.conditionsText || ''}
                  onChange={(e) => {
                    onOptionsChange({ conditionsText: e.target.value });
                    form.setValue('terms', e.target.value);
                  }}
                  className="min-h-[80px] text-sm"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Signature */}
          <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={options.showSignature}
              onCheckedChange={(checked) =>
                handleCheckboxChange('showSignature', checked === true)
              }
            />
            <div>
              <span className="text-sm font-medium">Champ signature</span>
              <p className="text-xs text-muted-foreground">Zone de signature avec ligne pointillée</p>
            </div>
          </label>

          {/* Document title */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={!!options.documentTitle}
                onCheckedChange={(checked) =>
                  onOptionsChange({ documentTitle: checked ? 'Devis de prestation' : undefined })
                }
              />
              <div>
                <span className="text-sm font-medium">Intitulé du document</span>
                <p className="text-xs text-muted-foreground">Titre personnalisé au-dessus du badge</p>
              </div>
            </label>
            {options.documentTitle && (
              <div className="ml-8">
                <Input
                  placeholder="Ex: Devis de prestation"
                  value={options.documentTitle || ''}
                  onChange={(e) => onOptionsChange({ documentTitle: e.target.value || 'Devis' })}
                  className="text-sm"
                />
              </div>
            )}
          </div>

          {/* Free field */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={options.showFreeField}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('showFreeField', checked === true)
                }
              />
              <div>
                <span className="text-sm font-medium">Champ libre</span>
                <p className="text-xs text-muted-foreground">Section de contenu libre</p>
              </div>
            </label>
            {options.showFreeField && (
              <div className="ml-8">
                <Textarea
                  placeholder="Contenu libre..."
                  value={options.freeFieldContent || ''}
                  onChange={(e) => onOptionsChange({ freeFieldContent: e.target.value })}
                  className="min-h-[80px] text-sm"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Global discount */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={options.showGlobalDiscount}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('showGlobalDiscount', checked === true)
                }
              />
              <div>
                <span className="text-sm font-medium">Remise globale</span>
                <p className="text-xs text-muted-foreground">Appliquée sur le sous-total HT</p>
              </div>
            </label>
            {options.showGlobalDiscount && (
              <div className="ml-8 flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Remise %</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    value={options.globalDiscountPercent || ''}
                    onChange={(e) =>
                      onOptionsChange({
                        globalDiscountPercent: e.target.value ? parseFloat(e.target.value) : 0,
                        globalDiscountAmount: 0,
                      })
                    }
                    className="text-sm h-8"
                  />
                </div>
                <span className="text-xs text-muted-foreground pt-5">ou</span>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Remise €</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={options.globalDiscountAmount || ''}
                    onChange={(e) =>
                      onOptionsChange({
                        globalDiscountAmount: e.target.value ? parseFloat(e.target.value) : 0,
                        globalDiscountPercent: 0,
                      })
                    }
                    className="text-sm h-8"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
              <Checkbox
                checked={options.showPaymentMethod || false}
                onCheckedChange={(checked) =>
                  handleCheckboxChange('showPaymentMethod', checked === true)
                }
              />
              <div>
                <span className="text-sm font-medium">Moyen de paiement</span>
                <p className="text-xs text-muted-foreground">Pré-rempli depuis votre compte bancaire</p>
              </div>
            </label>
            {options.showPaymentMethod && (
              <div className="ml-8">
                <Textarea
                  placeholder="IBAN, BIC, etc."
                  value={options.paymentMethodText || ''}
                  onChange={(e) => onOptionsChange({ paymentMethodText: e.target.value })}
                  className="min-h-[80px] text-sm"
                  rows={3}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Section: Options client */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User className="w-4 h-4" />
          <span>Client</span>
        </div>

        <div className="space-y-2 pl-1">
          <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={options.showDeliveryAddress || false}
              onCheckedChange={(checked) =>
                handleCheckboxChange('showDeliveryAddress', checked === true)
              }
            />
            <span className="text-sm">Adresse de livraison</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={options.showSirenSiret || false}
              onCheckedChange={(checked) =>
                handleCheckboxChange('showSirenSiret', checked === true)
              }
            />
            <span className="text-sm">SIREN ou SIRET</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
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

      {/* Section: Notes internes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>Notes internes</span>
          <span className="text-xs font-normal text-muted-foreground/70">
            — Non visibles dans le devis
          </span>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Notes visibles uniquement par vous..."
                  className="min-h-[80px] text-sm"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
