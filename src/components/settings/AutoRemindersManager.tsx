import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
  Clock,
  Bell,
  Play,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  useAutoReminderRules,
  useCreateAutoReminderRule,
  useUpdateAutoReminderRule,
  useDeleteAutoReminderRule,
  useToggleAutoReminderRule,
  useProcessAutoReminders,
  type AutoReminderRule,
  type AutoReminderRuleInput,
  type ReminderActionType,
  type ReminderPriority,
} from '@/hooks/useAutoReminders';
import { useProspectStatuses } from '@/hooks/useProspectStatuses';
import { cn } from '@/lib/utils';

const ruleSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  trigger_status_id: z.string().optional(),
  days_in_status: z.coerce.number().min(1, 'Minimum 1 jour'),
  action_type: z.enum(['reminder', 'notification', 'status_change']),
  reminder_title: z.string().optional(),
  reminder_message: z.string().optional(),
  new_status_id: z.string().optional(),
  notify_created_by: z.boolean().default(true),
  notify_assigned_to: z.boolean().default(true),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

const actionTypeLabels: Record<ReminderActionType, string> = {
  reminder: 'Créer un rappel',
  notification: 'Envoyer une notification',
  status_change: 'Changer le statut',
};

const priorityLabels: Record<ReminderPriority, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'bg-gray-100 text-gray-800' },
  normal: { label: 'Normale', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' },
};

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: AutoReminderRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <Card className={cn(!rule.is_active && 'opacity-60')}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{rule.name}</h4>
              <Badge variant="outline" className={priorityLabels[rule.priority].color}>
                {priorityLabels[rule.priority].label}
              </Badge>
              {!rule.is_active && (
                <Badge variant="secondary">Désactivé</Badge>
              )}
            </div>
            {rule.description && (
              <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Après <strong>{rule.days_in_status}</strong> jours
                  {rule.trigger_status && (
                    <> en <Badge variant="outline" style={{ backgroundColor: rule.trigger_status.color + '20', borderColor: rule.trigger_status.color }}>
                      {rule.trigger_status.name}
                    </Badge></>
                  )}
                </span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                {rule.action_type === 'reminder' && <Bell className="h-3.5 w-3.5" />}
                {rule.action_type === 'notification' && <Zap className="h-3.5 w-3.5" />}
                {rule.action_type === 'status_change' && <RefreshCw className="h-3.5 w-3.5" />}
                <span>{actionTypeLabels[rule.action_type]}</span>
                {rule.action_type === 'status_change' && rule.new_status && (
                  <Badge variant="outline" style={{ backgroundColor: rule.new_status.color + '20', borderColor: rule.new_status.color }}>
                    {rule.new_status.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.is_active}
              onCheckedChange={onToggle}
            />
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
  rule?: AutoReminderRule;
}) {
  const { data: statuses } = useProspectStatuses();
  const createRule = useCreateAutoReminderRule();
  const updateRule = useUpdateAutoReminderRule();

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: rule?.name || '',
      description: rule?.description || '',
      trigger_status_id: rule?.trigger_status_id || '',
      days_in_status: rule?.days_in_status || 7,
      action_type: rule?.action_type || 'reminder',
      reminder_title: rule?.reminder_title || '',
      reminder_message: rule?.reminder_message || '',
      new_status_id: rule?.new_status_id || '',
      notify_created_by: rule?.notify_created_by ?? true,
      notify_assigned_to: rule?.notify_assigned_to ?? true,
      priority: rule?.priority || 'normal',
    },
  });

  const actionType = form.watch('action_type');

  const handleSubmit = async (values: RuleFormValues) => {
    const input: AutoReminderRuleInput = {
      name: values.name,
      description: values.description,
      trigger_status_id: values.trigger_status_id || null,
      days_in_status: values.days_in_status,
      action_type: values.action_type,
      reminder_title: values.reminder_title,
      reminder_message: values.reminder_message,
      new_status_id: values.new_status_id || null,
      notify_created_by: values.notify_created_by,
      notify_assigned_to: values.notify_assigned_to,
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{rule ? 'Modifier la règle' : 'Nouvelle règle de relance'}</DialogTitle>
          <DialogDescription>
            Configurez une règle de relance automatique basée sur le statut des prospects
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
                    <Input placeholder="Ex: Relance après 7 jours sans action" {...field} />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="trigger_status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut déclencheur</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Tous les statuts</SelectItem>
                        {statuses?.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="days_in_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jours dans ce statut</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="action_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action à effectuer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="reminder">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Créer un rappel
                        </div>
                      </SelectItem>
                      <SelectItem value="notification">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Envoyer une notification
                        </div>
                      </SelectItem>
                      <SelectItem value="status_change">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Changer le statut
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(actionType === 'reminder' || actionType === 'notification') && (
              <>
                <FormField
                  control={form.control}
                  name="reminder_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre du message</FormLabel>
                      <FormControl>
                        <Input placeholder="Relance prospect" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reminder_message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ce prospect n'a pas été contacté depuis..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-6">
                  <FormField
                    control={form.control}
                    name="notify_created_by"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0">Notifier le créateur</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notify_assigned_to"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0">Notifier l'assigné</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {actionType === 'status_change' && (
              <FormField
                control={form.control}
                name="new_status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses?.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
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

export function AutoRemindersManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutoReminderRule | undefined>();
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const { data: rules, isLoading } = useAutoReminderRules();
  const deleteRule = useDeleteAutoReminderRule();
  const toggleRule = useToggleAutoReminderRule();
  const processReminders = useProcessAutoReminders();

  const handleEdit = (rule: AutoReminderRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deletingRuleId) {
      await deleteRule.mutateAsync(deletingRuleId);
      setDeletingRuleId(null);
    }
  };

  const handleToggle = (rule: AutoReminderRule) => {
    toggleRule.mutate({ id: rule.id, isActive: !rule.is_active });
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
                <Clock className="h-5 w-5" />
                Relances automatiques
              </CardTitle>
              <CardDescription>
                Configurez des règles pour créer automatiquement des rappels basés sur le statut des prospects
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => processReminders.mutate()}
                disabled={processReminders.isPending}
              >
                {processReminders.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Exécuter maintenant
              </Button>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!rules || rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Aucune règle configurée</p>
              <p className="text-xs text-muted-foreground">
                Créez votre première règle de relance automatique
              </p>
            </div>
          ) : (
            rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => handleEdit(rule)}
                onDelete={() => setDeletingRuleId(rule.id)}
                onToggle={() => handleToggle(rule)}
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
