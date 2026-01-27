import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Percent,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  DollarSign,
  TrendingUp,
  Users,
  Trophy,
} from 'lucide-react';
import {
  useCommissionRules,
  useCreateCommissionRule,
  useUpdateCommissionRule,
  useDeleteCommissionRule,
  type CommissionRule,
  type CommissionRuleInput,
  type CommissionRuleType,
  type CommissionTier,
} from '@/hooks/useCommissions';
import { useOrganizationUsers } from '@/hooks/useOrganizationUsers';
import { cn } from '@/lib/utils';

const tierSchema = z.object({
  min: z.coerce.number().min(0),
  max: z.coerce.number().nullable(),
  rate: z.coerce.number().min(0).max(100),
});

const ruleSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  rule_type: z.enum(['percentage', 'fixed', 'tiered', 'bonus']),
  base_percentage: z.coerce.number().min(0).max(100).optional(),
  fixed_amount: z.coerce.number().min(0).optional(),
  tiers: z.array(tierSchema).optional(),
  min_invoice_amount: z.coerce.number().min(0).nullable().optional(),
  bonus_percentage: z.coerce.number().min(0).max(100).optional(),
  bonus_threshold_amount: z.coerce.number().min(0).nullable().optional(),
  applies_to_user_id: z.string().optional(),
  is_active: z.boolean().default(true),
  priority: z.coerce.number().default(0),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

const ruleTypeLabels: Record<CommissionRuleType, { label: string; icon: React.ReactNode; description: string }> = {
  percentage: {
    label: 'Pourcentage',
    icon: <Percent className="h-4 w-4" />,
    description: 'Commission basée sur un pourcentage du montant',
  },
  fixed: {
    label: 'Montant fixe',
    icon: <DollarSign className="h-4 w-4" />,
    description: 'Commission fixe par facture',
  },
  tiered: {
    label: 'Paliers',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Commission par tranches de montant',
  },
  bonus: {
    label: 'Bonus',
    icon: <Trophy className="h-4 w-4" />,
    description: 'Bonus additionnel si conditions atteintes',
  },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
}: {
  rule: CommissionRule;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ruleType = ruleTypeLabels[rule.rule_type];

  return (
    <Card className={cn(!rule.is_active && 'opacity-60')}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                {ruleType.icon}
              </div>
              <div>
                <h4 className="font-medium">{rule.name}</h4>
                {!rule.is_active && (
                  <Badge variant="secondary" className="text-xs">Désactivé</Badge>
                )}
              </div>
            </div>
            {rule.description && (
              <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
            )}
            
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="outline">{ruleType.label}</Badge>
              
              {rule.rule_type === 'percentage' && (
                <span className="text-muted-foreground">
                  <strong>{rule.base_percentage}%</strong> du montant HT
                </span>
              )}
              
              {rule.rule_type === 'fixed' && (
                <span className="text-muted-foreground">
                  <strong>{formatCurrency(rule.fixed_amount)}</strong> par facture
                </span>
              )}
              
              {rule.rule_type === 'tiered' && rule.tiers && (
                <span className="text-muted-foreground">
                  <strong>{rule.tiers.length}</strong> paliers configurés
                </span>
              )}
              
              {rule.min_invoice_amount && (
                <span className="text-muted-foreground">
                  Min: {formatCurrency(rule.min_invoice_amount)}
                </span>
              )}
              
              {rule.bonus_percentage > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  +{rule.bonus_percentage}% bonus
                </Badge>
              )}
              
              {rule.applies_to_user && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {rule.applies_to_user.first_name} {rule.applies_to_user.last_name}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RuleFormDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: CommissionRule;
}) {
  const { data: users } = useOrganizationUsers();
  const createRule = useCreateCommissionRule();
  const updateRule = useUpdateCommissionRule();

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: rule?.name || '',
      description: rule?.description || '',
      rule_type: rule?.rule_type || 'percentage',
      base_percentage: rule?.base_percentage || 5,
      fixed_amount: rule?.fixed_amount || 0,
      tiers: rule?.tiers || [{ min: 0, max: 10000, rate: 3 }, { min: 10000, max: null, rate: 5 }],
      min_invoice_amount: rule?.min_invoice_amount || null,
      bonus_percentage: rule?.bonus_percentage || 0,
      bonus_threshold_amount: rule?.bonus_threshold_amount || null,
      applies_to_user_id: rule?.applies_to_user_id || '',
      is_active: rule?.is_active ?? true,
      priority: rule?.priority || 0,
    },
  });

  const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
    control: form.control,
    name: 'tiers',
  });

  const ruleType = form.watch('rule_type');

  const handleSubmit = async (values: RuleFormValues) => {
    const input: CommissionRuleInput = {
      name: values.name,
      description: values.description,
      rule_type: values.rule_type,
      base_percentage: values.base_percentage,
      fixed_amount: values.fixed_amount,
      tiers: values.rule_type === 'tiered' ? values.tiers as CommissionTier[] : undefined,
      min_invoice_amount: values.min_invoice_amount,
      bonus_percentage: values.bonus_percentage,
      bonus_threshold_amount: values.bonus_threshold_amount,
      applies_to_user_id: values.applies_to_user_id || null,
      is_active: values.is_active,
      priority: values.priority,
    };

    if (rule) {
      await updateRule.mutateAsync({ id: rule.id, ...input });
    } else {
      await createRule.mutateAsync(input);
    }
    onOpenChange(false);
  };

  const isLoading = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Modifier la règle' : 'Nouvelle règle de commission'}</DialogTitle>
          <DialogDescription>
            Configurez les paramètres de calcul des commissions
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la règle</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Commission standard 5%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Décrivez cette règle..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rule_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de commission</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ruleTypeLabels).map(([value, { label, icon, description }]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {icon}
                            <div>
                              <div>{label}</div>
                              <div className="text-xs text-muted-foreground">{description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {ruleType === 'percentage' && (
              <FormField
                control={form.control}
                name="base_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pourcentage de commission</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="0.1" min="0" max="100" {...field} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Pourcentage appliqué sur le montant HT de la facture
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {ruleType === 'fixed' && (
              <FormField
                control={form.control}
                name="fixed_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant fixe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="0.01" min="0" {...field} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Montant fixe par facture payée
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {ruleType === 'tiered' && (
              <div className="space-y-3">
                <FormLabel>Paliers de commission</FormLabel>
                <FormDescription>
                  Définissez les tranches de montant et leur taux de commission
                </FormDescription>
                
                {tierFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <FormField
                      control={form.control}
                      name={`tiers.${index}.min`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="sr-only">Min</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" placeholder="Min" {...field} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-muted-foreground">→</span>
                    <FormField
                      control={form.control}
                      name={`tiers.${index}.max`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="sr-only">Max</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="Max (ou vide)"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`tiers.${index}.rate`}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormLabel className="sr-only">Taux</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" step="0.1" placeholder="%" {...field} />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTier(index)}
                      disabled={tierFields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendTier({ min: 0, max: null, rate: 5 })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un palier
                </Button>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_invoice_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant minimum facture</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Aucun"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Optionnel : montant HT minimum pour déclencher la commission
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applies_to_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicable à</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les commerciaux" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Tous les commerciaux</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Limiter cette règle à un utilisateur spécifique
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bonus_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bonus additionnel</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" step="0.1" min="0" max="100" {...field} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bonus_threshold_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seuil pour bonus</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Montant seuil"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Règle active</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {rule ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function CommissionsManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | undefined>();
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const { data: rules, isLoading } = useCommissionRules();
  const deleteRule = useDeleteCommissionRule();

  const handleEdit = (rule: CommissionRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deletingRuleId) {
      await deleteRule.mutateAsync(deletingRuleId);
      setDeletingRuleId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Règles de commissions
              </CardTitle>
              <CardDescription>
                Configurez les règles de calcul des commissions pour vos commerciaux
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingRule(undefined);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle règle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!rules || rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Percent className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Aucune règle configurée</p>
              <p className="text-xs text-muted-foreground">
                Créez votre première règle de commission
              </p>
            </div>
          ) : (
            rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => handleEdit(rule)}
                onDelete={() => setDeletingRuleId(rule.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <RuleFormDialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingRule(undefined);
        }}
        rule={editingRule}
      />

      <AlertDialog open={!!deletingRuleId} onOpenChange={() => setDeletingRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette règle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La règle sera définitivement supprimée.
              Les commissions déjà calculées ne seront pas affectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
