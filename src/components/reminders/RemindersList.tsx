import { useState } from 'react';
import { format, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
  Bell,
  BellRing,
  Plus,
  Trash2,
  Clock,
  Building2,
  User,
  RefreshCcw,
} from 'lucide-react';
import {
  useReminders,
  useCompleteReminder,
  useDeleteReminder,
  type ReminderWithRelations,
} from '@/hooks/useReminders';
import { ReminderForm } from './ReminderForm';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface RemindersListProps {
  prospectId?: string;
  contactId?: string;
  showHeader?: boolean;
  limit?: number;
}

function getDateLabel(date: Date): { label: string; variant: 'destructive' | 'warning' | 'secondary' | 'default' } {
  if (isPast(date)) {
    return { label: 'En retard', variant: 'destructive' };
  }
  if (isToday(date)) {
    return { label: "Aujourd'hui", variant: 'warning' };
  }
  if (isTomorrow(date)) {
    return { label: 'Demain', variant: 'secondary' };
  }
  if (isThisWeek(date)) {
    return { label: format(date, 'EEEE', { locale: fr }), variant: 'default' };
  }
  return { label: format(date, 'd MMM', { locale: fr }), variant: 'default' };
}

function ReminderItem({
  reminder,
  onComplete,
  onDelete,
}: {
  reminder: ReminderWithRelations;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const remindDate = new Date(reminder.remind_at);
  const dateInfo = getDateLabel(remindDate);
  const isOverdue = isPast(remindDate);

  // Use notes field as description fallback
  const reminderDescription = reminder.notes;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        isOverdue && !reminder.is_completed ? 'border-destructive/50 bg-destructive/5' : 'hover:bg-muted/50'
      )}
    >
      <Checkbox
        checked={reminder.is_completed}
        onCheckedChange={onComplete}
        className="mt-1"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className={cn(
            'font-medium text-sm',
            reminder.is_completed && 'line-through text-muted-foreground'
          )}>
            {reminder.title}
          </p>
          <Badge variant={dateInfo.variant as any} className="text-xs">
            {dateInfo.label}
          </Badge>
          {reminder.recurrence && reminder.recurrence !== 'none' && (
            <RefreshCcw className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        {reminderDescription && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {reminderDescription}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(remindDate, "HH'h'mm", { locale: fr })}
          </span>
          {reminder.prospect && (
            <Link
              to={`/crm?prospect=${reminder.prospect.id}`}
              className="flex items-center gap-1 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Building2 className="h-3 w-3" />
              {reminder.prospect.company_name}
            </Link>
          )}
          {reminder.contact && (
            <Link
              to={`/clients/${reminder.contact.id}`}
              className="flex items-center gap-1 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <User className="h-3 w-3" />
              {reminder.contact.company_name ||
                `${reminder.contact.first_name} ${reminder.contact.last_name}`}
            </Link>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function RemindersList({
  prospectId,
  contactId,
  showHeader = true,
  limit,
}: RemindersListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<ReminderWithRelations | null>(null);
  
  const { data: reminders, isLoading } = useReminders({ prospectId, contactId });
  const completeReminder = useCompleteReminder();
  const deleteReminder = useDeleteReminder();

  const handleDelete = () => {
    if (reminderToDelete) {
      deleteReminder.mutate(reminderToDelete.id, {
        onSuccess: () => setReminderToDelete(null),
      });
    }
  };

  const displayReminders = limit ? reminders?.slice(0, limit) : reminders;
  const overdueCount = reminders?.filter(
    (r) => !r.is_completed && isPast(new Date(r.remind_at))
  ).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {overdueCount > 0 ? (
                    <BellRing className="h-4 w-4 text-destructive" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  Rappels
                  {overdueCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {overdueCount} en retard
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {reminders?.length || 0} rappel{(reminders?.length || 0) > 1 ? 's' : ''} programmé{(reminders?.length || 0) > 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
        )}
        <CardContent className={cn(!showHeader && 'pt-6')}>
          {!displayReminders || displayReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Aucun rappel</p>
              <p className="text-xs text-muted-foreground">
                Créez un rappel pour ne rien oublier
              </p>
              {!showHeader && (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Créer un rappel
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {displayReminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  onComplete={() => completeReminder.mutate(reminder.id)}
                  onDelete={() => setReminderToDelete(reminder)}
                />
              ))}
              {limit && reminders && reminders.length > limit && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  + {reminders.length - limit} autres rappels
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ReminderForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        prospectId={prospectId}
        contactId={contactId}
      />

      <AlertDialog open={!!reminderToDelete} onOpenChange={() => setReminderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce rappel ?</AlertDialogTitle>
            <AlertDialogDescription>
              {reminderToDelete && (
                <>
                  Le rappel "{reminderToDelete.title}" sera supprimé définitivement.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
