import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Article, ArticleFormData, useTaxRates } from '@/hooks/useArticles';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const articleSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  reference: z.string().optional(),
  unit_price: z.coerce.number().min(0, 'Le prix doit être positif'),
  unit: z.string().min(1, 'L\'unité est obligatoire'),
  tax_rate_id: z.string().optional(),
  type: z.enum(['product', 'service']),
  category: z.string().optional(),
  is_active: z.boolean().default(true),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

interface ArticleFormProps {
  article?: Article | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ArticleFormData) => void;
  isLoading?: boolean;
}

const COMMON_UNITS = [
  // Temps
  { value: 'heure', label: 'Heure', category: 'Temps' },
  { value: 'jour', label: 'Jour', category: 'Temps' },
  { value: 'semaine', label: 'Semaine', category: 'Temps' },
  { value: 'mois', label: 'Mois', category: 'Temps' },
  { value: 'trimestre', label: 'Trimestre', category: 'Temps' },
  { value: 'semestre', label: 'Semestre', category: 'Temps' },
  { value: 'an', label: 'An', category: 'Temps' },
  // Quantité
  { value: 'unité', label: 'Unité', category: 'Quantité' },
  { value: 'pièce', label: 'Pièce', category: 'Quantité' },
  { value: 'lot', label: 'Lot', category: 'Quantité' },
  { value: 'forfait', label: 'Forfait', category: 'Quantité' },
  { value: 'licence', label: 'Licence', category: 'Quantité' },
  // Poids / Volume
  { value: 'kg', label: 'Kilogramme', category: 'Poids' },
  { value: 'g', label: 'Gramme', category: 'Poids' },
  { value: 'L', label: 'Litre', category: 'Volume' },
  { value: 'mL', label: 'Millilitre', category: 'Volume' },
  // Longueur / Surface
  { value: 'm', label: 'Mètre', category: 'Longueur' },
  { value: 'cm', label: 'Centimètre', category: 'Longueur' },
  { value: 'm²', label: 'Mètre carré', category: 'Surface' },
  { value: 'm³', label: 'Mètre cube', category: 'Volume' },
];

export const ArticleForm = ({
  article,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ArticleFormProps) => {
  const { data: taxRates } = useTaxRates();
  const isEditing = !!article;
  const [unitOpen, setUnitOpen] = useState(false);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      name: '',
      description: '',
      reference: '',
      unit_price: 0,
      unit: 'unité',
      tax_rate_id: undefined,
      type: 'product',
      category: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (article) {
      form.reset({
        name: article.name,
        description: article.description ?? '',
        reference: article.reference ?? '',
        unit_price: article.unit_price,
        unit: article.unit,
        tax_rate_id: article.tax_rate_id ?? undefined,
        type: article.type,
        category: article.category ?? '',
        is_active: article.is_active,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        reference: '',
        unit_price: 0,
        unit: 'unité',
        tax_rate_id: undefined,
        type: 'product',
        category: '',
        is_active: true,
      });
    }
  }, [article, form]);

  const handleSubmit = (values: ArticleFormValues) => {
    const formData: ArticleFormData = {
      name: values.name,
      type: values.type,
      unit_price: values.unit_price,
      unit: values.unit,
      description: values.description,
      reference: values.reference,
      tax_rate_id: values.tax_rate_id === 'none' || !values.tax_rate_id ? undefined : values.tax_rate_id,
      category: values.category,
      is_active: values.is_active,
    };
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'article' : 'Nouvel article'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="product">Produit</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom de l'article" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Référence</FormLabel>
                  <FormControl>
                    <Input placeholder="REF-001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Code ou référence interne de l'article
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description détaillée de l'article..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix HT *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Unité *</FormLabel>
                    <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={unitOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? COMMON_UNITS.find((unit) => unit.value === field.value)?.label || field.value
                              : "Sélectionner"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Rechercher une unité..." />
                          <CommandList>
                            <CommandEmpty>Aucune unité trouvée.</CommandEmpty>
                            <CommandGroup heading="Temps">
                              {COMMON_UNITS.filter(u => u.category === 'Temps').map((unit) => (
                                <CommandItem
                                  key={unit.value}
                                  value={unit.label}
                                  onSelect={() => {
                                    field.onChange(unit.value);
                                    setUnitOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === unit.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {unit.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandGroup heading="Quantité">
                              {COMMON_UNITS.filter(u => u.category === 'Quantité').map((unit) => (
                                <CommandItem
                                  key={unit.value}
                                  value={unit.label}
                                  onSelect={() => {
                                    field.onChange(unit.value);
                                    setUnitOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === unit.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {unit.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            <CommandGroup heading="Mesures">
                              {COMMON_UNITS.filter(u => ['Poids', 'Volume', 'Longueur', 'Surface'].includes(u.category)).map((unit) => (
                                <CommandItem
                                  key={unit.value}
                                  value={unit.label}
                                  onSelect={() => {
                                    field.onChange(unit.value);
                                    setUnitOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === unit.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {unit.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tax Rate */}
            <FormField
              control={form.control}
              name="tax_rate_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taux de TVA</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === 'none' ? undefined : val)}
                    value={field.value ?? 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un taux" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {taxRates?.map((rate) => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.name} ({rate.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Électronique, Conseil..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Article actif</FormLabel>
                    <FormDescription>
                      Les articles inactifs ne seront pas proposés dans les devis
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
