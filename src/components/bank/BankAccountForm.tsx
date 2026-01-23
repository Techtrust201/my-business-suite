import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch';
import { useBankAccount, useCreateBankAccount, useUpdateBankAccount } from '@/hooks/useBankAccounts';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  account_number: z.string().optional(),
  initial_balance: z.number().default(0),
  currency: z.string().default('EUR'),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface BankAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string | null;
}

export function BankAccountForm({
  open,
  onOpenChange,
  accountId,
}: BankAccountFormProps) {
  const createBankAccount = useCreateBankAccount();
  const updateBankAccount = useUpdateBankAccount();
  const { data: existingAccount, isLoading: isLoadingAccount } = useBankAccount(
    accountId || undefined
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      bank_name: '',
      iban: '',
      bic: '',
      account_number: '',
      initial_balance: 0,
      currency: 'EUR',
      is_active: true,
    },
  });

  useEffect(() => {
    if (existingAccount) {
      form.reset({
        name: existingAccount.name,
        bank_name: existingAccount.bank_name || '',
        iban: existingAccount.iban || '',
        bic: existingAccount.bic || '',
        account_number: existingAccount.account_number || '',
        initial_balance: existingAccount.initial_balance,
        currency: existingAccount.currency,
        is_active: existingAccount.is_active,
      });
    } else if (!accountId) {
      form.reset({
        name: '',
        bank_name: '',
        iban: '',
        bic: '',
        account_number: '',
        initial_balance: 0,
        currency: 'EUR',
        is_active: true,
      });
    }
  }, [existingAccount, accountId, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (accountId) {
        await updateBankAccount.mutateAsync({
          id: accountId,
          name: data.name,
          bank_name: data.bank_name,
          iban: data.iban,
          bic: data.bic,
          account_number: data.account_number,
          initial_balance: data.initial_balance,
          currency: data.currency,
          is_active: data.is_active,
        });
      } else {
        await createBankAccount.mutateAsync({
          name: data.name,
          bank_name: data.bank_name,
          iban: data.iban,
          bic: data.bic,
          account_number: data.account_number,
          initial_balance: data.initial_balance,
          currency: data.currency,
          is_active: data.is_active,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving bank account:', error);
    }
  };

  const isLoading =
    createBankAccount.isPending ||
    updateBankAccount.isPending ||
    isLoadingAccount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {accountId ? 'Modifier le compte' : 'Nouveau compte bancaire'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du compte *</FormLabel>
                  <FormControl>
                    <Input placeholder="Compte courant pro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banque</FormLabel>
                  <FormControl>
                    <Input placeholder="BNP Paribas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="iban"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IBAN</FormLabel>
                    <FormControl>
                      <Input placeholder="FR76..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BIC</FormLabel>
                    <FormControl>
                      <Input placeholder="BNPAFRPP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="initial_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solde initial (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Compte actif</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Inclure dans le solde total
                    </p>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {accountId ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

