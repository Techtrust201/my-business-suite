import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Clock, AlertTriangle, Users, FileText, Receipt, Building2 } from 'lucide-react';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useUpcomingReminders, useCompleteReminder, type Reminder } from '@/hooks/useReminders';

const ENTITY_ICONS: Record<Reminder['entity_type'], React.ReactNode> = {
  prospect: <Building2 className="h-4 w-4" />,
  client: <Users className="h-4 w-4" />,
  invoice: <Receipt className="h-4 w-4" />,
  quote: <FileText className="h-4 w-4" />,
};

const ENTITY_ROUTES: Record<Reminder['entity_type'], string> = {
  prospect: '/crm',
  client: '/clients',
  invoice: '/factures',
  quote: '/devis',
};

function getReminderDateLabel(dateStr: string): { label: string; variant: 'default' | 'destructive' | 'secondary' } {
  const date = new Date(dateStr);
  
  if (isPast(date) && !isToday(date)) {
    return { label: 'En retard', variant: 'destructive' };
  }
  if (isToday(date)) {
    return { label: "Aujourd'hui", variant: 'default' };
  }
  if (isTomorrow(date)) {
    return { label: 'Demain', variant: 'secondary' };
  }
  return { label: format(date, 'dd MMM', { locale: fr }), variant: 'secondary' };
}

export function RemindersWidget() {
  const navigate = useNavigate();
  const { data: reminders, isLoading } = useUpcomingReminders(7);
  const completeReminder = useCompleteReminder();

  const overdueCount = reminders?.filter(r => isPast(new Date(r.reminder_date)) && !isToday(new Date(r.reminder_date))).length || 0;
  const todayCount = reminders?.filter(r => isToday(new Date(r.reminder_date))).length || 0;

  const handleComplete = (reminderId: string) => {
    completeReminder.mutate(reminderId);
  };

  const handleNavigate = (reminder: Reminder) => {
    navigate(ENTITY_ROUTES[reminder.entity_type]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Rappels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Rappels
            {(overdueCount > 0 || todayCount > 0) && (
              <Badge variant={overdueCount > 0 ? 'destructive' : 'default'} className="ml-2">
                {overdueCount > 0 ? overdueCount : todayCount}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {reminders && reminders.length > 0 ? (
          <div className="space-y-2">
            {reminders.slice(0, 5).map((reminder) => {
              const dateInfo = getReminderDateLabel(reminder.reminder_date);
              const isOverdue = isPast(new Date(reminder.reminder_date)) && !isToday(new Date(reminder.reminder_date));

              return (
                <div
                  key={reminder.id}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50 ${
                    isOverdue ? 'bg-destructive/5' : ''
                  }`}
                >
                  <Checkbox
                    checked={reminder.is_completed}
                    onCheckedChange={() => handleComplete(reminder.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {reminder.title}
                      </span>
                      <Badge variant={dateInfo.variant} className="text-xs shrink-0">
                        {isOverdue && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {dateInfo.label}
                      </Badge>
                    </div>
                    {reminder.entity_name && (
                      <button
                        onClick={() => handleNavigate(reminder)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mt-0.5"
                      >
                        {ENTITY_ICONS[reminder.entity_type]}
                        <span className="truncate">{reminder.entity_name}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {reminders.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{reminders.length - 5} autres rappels
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun rappel à venir</p>
            <p className="text-xs">Les rappels créés depuis les fiches prospects apparaîtront ici</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
