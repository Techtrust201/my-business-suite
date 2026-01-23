import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, addHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateReminder, type RecurrenceType } from '@/hooks/useReminders';

const reminderSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  notes: z.string().optional(),
  date: z.date({ required_error: 'Date requise' }),
  time: z.string().min(1, 'Heure requise'),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

interface ReminderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId?: string;
  contactId?: string;
  quoteId?: string;
  invoiceId?: string;
  defaultTitle?: string;
}

const quickTimeOptions = [
  { label: 'Dans 1 heure', getDate: () => addHours(new Date(), 1) },
  { label: 'Dans 3 heures', getDate: () => addHours(new Date(), 3) },
  { label: 'Demain matin', getDate: () => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }},
  { label: 'Demain après-midi', getDate: () => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  }},
  { label: 'Dans une semaine', getDate: () => {
    const nextWeek = addDays(new Date(), 7);
    nextWeek.setHours(9, 0, 0, 0);
    return nextWeek;
  }},
];

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'Pas de récurrence' },
  { value: 'daily', label: 'Tous les jours' },
  { value: 'weekly', label: 'Toutes les semaines' },
  { value: 'monthly', label: 'Tous les mois' },
];

export function ReminderForm({
  open,
  onOpenChange,
  prospectId,
  contactId,
  quoteId,
  invoiceId,
  defaultTitle = '',
}: ReminderFormProps) {
  const createReminder = useCreateReminder();
  
  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: defaultTitle,
      notes: '',
      date: addDays(new Date(), 1),
      time: '09:00',
      recurrence: 'none',
    },
  });

  const handleQuickTime = (getDate: () => Date) => {
    const date = getDate();
    form.setValue('date', date);
    form.setValue('time', format(date, 'HH:mm'));
  };

  const handleSubmit = (values: ReminderFormValues) => {
    const [hours, minutes] = values.time.split(':').map(Number);
    const remindAt = new Date(values.date);
    remindAt.setHours(hours, minutes, 0, 0);

    createReminder.mutate(
      {
        title: values.title,
        description: values.notes,
        remind_at: remindAt.toISOString(),
        prospect_id: prospectId,
        contact_id: contactId,
        quote_id: quoteId,
        invoice_id: invoiceId,
        recurrence: values.recurrence as RecurrenceType,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un rappel</DialogTitle>
          <DialogDescription>
            Programmez un rappel pour ne rien oublier
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Quick time buttons */}
            <div className="flex flex-wrap gap-2">
              {quickTimeOptions.map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleQuickTime(option.getDate)}
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Rappeler le client" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes supplémentaires..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: fr })
                            ) : (
                              <span>Choisir une date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="time" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="recurrence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Récurrence</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pas de récurrence" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recurrenceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createReminder.isPending}>
                {createReminder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le rappel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
