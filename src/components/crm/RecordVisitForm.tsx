import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateProspectVisit, useUpdateProspect, type ProspectWithStatus } from '@/hooks/useProspects';
import { useActiveProspectStatuses } from '@/hooks/useProspectStatuses';
import { useAuth } from '@/hooks/useAuth';

const visitSchema = z.object({
  notes: z.string().optional(),
  duration_minutes: z.coerce.number().min(0).optional(),
  status_after_id: z.string().optional(),
  next_action: z.string().optional(),
  next_action_date: z.date().optional(),
});

type VisitFormData = z.infer<typeof visitSchema>;

interface RecordVisitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: ProspectWithStatus;
}

export function RecordVisitForm({ open, onOpenChange, prospect }: RecordVisitFormProps) {
  const { user } = useAuth();
  const { data: statuses } = useActiveProspectStatuses();
  const createVisit = useCreateProspectVisit();
  const updateProspect = useUpdateProspect();
  
  const form = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      notes: '',
      duration_minutes: 30,
      status_after_id: prospect.status_id || undefined,
      next_action: '',
      next_action_date: undefined,
    },
  });

  const onSubmit = async (data: VisitFormData) => {
    if (!user) return;

    try {
      // Create visit record
      await createVisit.mutateAsync({
        prospect_id: prospect.id,
        visited_by: user.id,
        visited_at: new Date().toISOString(),
        duration_minutes: data.duration_minutes || null,
        status_before_id: prospect.status_id,
        status_after_id: data.status_after_id || null,
        notes: data.notes || null,
        next_action: data.next_action || null,
        next_action_date: data.next_action_date ? format(data.next_action_date, 'yyyy-MM-dd') : null,
        visit_latitude: null,
        visit_longitude: null,
      });

      // Update prospect status if changed
      if (data.status_after_id && data.status_after_id !== prospect.status_id) {
        await updateProspect.mutateAsync({
          id: prospect.id,
          status_id: data.status_after_id,
        });
      }

      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error recording visit:', error);
    }
  };

  const isSubmitting = createVisit.isPending || updateProspect.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enregistrer une visite</DialogTitle>
          <DialogDescription>
            {prospect.company_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes de visite</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Compte-rendu de la visite..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durée (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status change */}
            <FormField
              control={form.control}
              name="status_after_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Statut après visite" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses?.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
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

            {/* Next action */}
            <FormField
              control={form.control}
              name="next_action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prochaine action</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Envoyer un devis, Rappeler..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Next action date */}
            <FormField
              control={form.control}
              name="next_action_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date prochaine action</FormLabel>
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
                            <span>Sélectionner une date</span>
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
