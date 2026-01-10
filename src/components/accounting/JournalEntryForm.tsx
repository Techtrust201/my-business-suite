import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useCreateJournalEntry } from '@/hooks/useJournalEntries';
import { cn } from '@/lib/utils';

const lineSchema = z.object({
  account_id: z.string().min(1, 'Compte requis'),
  description: z.string().optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
});

const formSchema = z.object({
  date: z.string().min(1, 'Date requise'),
  description: z.string().min(1, 'Libellé requis'),
  journal_type: z.enum(['sales', 'purchases', 'bank', 'general']),
  lines: z.array(lineSchema).min(2, 'Minimum 2 lignes'),
});

type FormData = z.infer<typeof formSchema>;

interface JournalEntryFormProps {
  onSuccess?: () => void;
}

export function JournalEntryForm({ onSuccess }: JournalEntryFormProps) {
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const createEntry = useCreateJournalEntry();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      description: '',
      journal_type: 'general',
      lines: [
        { account_id: '', description: '', debit: 0, credit: 0 },
        { account_id: '', description: '', debit: 0, credit: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const watchLines = form.watch('lines');
  const totalDebit = watchLines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = watchLines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const onSubmit = async (data: FormData) => {
    await createEntry.mutateAsync({
      date: data.date,
      description: data.description,
      journal_type: data.journal_type,
      lines: data.lines.map(line => ({
        account_id: line.account_id,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
      })),
    });
    onSuccess?.();
  };

  // Group accounts by class for better selection
  const groupedAccounts = (accounts || []).reduce((acc, account) => {
    const classKey = account.account_class;
    if (!acc[classKey]) {
      acc[classKey] = [];
    }
    acc[classKey].push(account);
    return acc;
  }, {} as Record<number, typeof accounts>);

  const classNames: Record<number, string> = {
    1: 'Capitaux',
    2: 'Immobilisations',
    3: 'Stocks',
    4: 'Tiers',
    5: 'Financier',
    6: 'Charges',
    7: 'Produits',
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="journal_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Journal</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un journal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="general">Opérations diverses</SelectItem>
                    <SelectItem value="sales">Ventes</SelectItem>
                    <SelectItem value="purchases">Achats</SelectItem>
                    <SelectItem value="bank">Banque</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-1">
                <FormLabel>Libellé</FormLabel>
                <FormControl>
                  <Input placeholder="Description de l'écriture" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Lines */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Lignes d'écriture</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ account_id: '', description: '', debit: 0, credit: 0 })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une ligne
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted text-sm font-medium">
              <div className="col-span-4">Compte</div>
              <div className="col-span-3">Libellé</div>
              <div className="col-span-2 text-right">Débit</div>
              <div className="col-span-2 text-right">Crédit</div>
              <div className="col-span-1"></div>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-t items-center">
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.account_id`}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Compte..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {Object.entries(groupedAccounts).map(([classNum, classAccounts]) => (
                            <div key={classNum}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                                Classe {classNum} - {classNames[Number(classNum)]}
                              </div>
                              {(classAccounts || []).map(account => (
                                <SelectItem key={account.id} value={account.id}>
                                  <span className="font-mono text-xs mr-2">{account.account_number}</span>
                                  {account.name}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.description`}
                    render={({ field }) => (
                      <Input placeholder="Libellé ligne" {...field} value={field.value || ''} />
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.debit`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="text-right"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.credit`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="text-right"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    )}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="grid grid-cols-12 gap-2 px-3 py-3 border-t bg-muted/50">
              <div className="col-span-4 font-medium">Totaux</div>
              <div className="col-span-3"></div>
              <div className="col-span-2 text-right font-bold tabular-nums">
                {formatCurrency(totalDebit)}
              </div>
              <div className="col-span-2 text-right font-bold tabular-nums">
                {formatCurrency(totalCredit)}
              </div>
              <div className="col-span-1"></div>
            </div>
          </div>

          {/* Balance indicator */}
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            isBalanced 
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          )}>
            {isBalanced ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Écriture équilibrée</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Écriture non équilibrée (différence: {formatCurrency(Math.abs(totalDebit - totalCredit))})
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={createEntry.isPending || !isBalanced}>
            {createEntry.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer l'écriture
          </Button>
        </div>
      </form>
    </Form>
  );
}
