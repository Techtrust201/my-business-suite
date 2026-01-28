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
  Building,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  CreditCard,
} from 'lucide-react';
import {
  useBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  useSetDefaultBankAccount,
  type BankAccount,
  type BankAccountInput,
} from '@/hooks/useBankAccounts';
import { cn } from '@/lib/utils';

const bankAccountSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  bank_name: z.string().min(1, 'Nom de la banque requis'),
  iban: z.string().min(1, 'IBAN requis').regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/, 'IBAN invalide'),
  bic: z.string().optional(),
  account_holder: z.string().optional(),
  is_active: z.boolean().default(true),
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

function formatIBAN(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function BankAccountCard({
  account,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  account: BankAccount;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <Card className={cn(!account.is_active && 'opacity-60')}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">{account.name}</h4>
                {account.is_default && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3 mr-1" />
                    Par défaut
                  </Badge>
                )}
                {!account.is_active && (
                  <Badge variant="secondary">Désactivé</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{account.bank_name}</p>
              <p className="text-sm font-mono mt-1">{formatIBAN(account.iban)}</p>
              {account.bic && (
                <p className="text-xs text-muted-foreground">BIC: {account.bic}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!account.is_default && (
              <Button variant="ghost" size="sm" onClick={onSetDefault}>
                <Star className="h-4 w-4 mr-1" />
                Par défaut
              </Button>
            )}
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

function BankAccountFormDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: BankAccount;
}) {
  const createAccount = useCreateBankAccount();
  const updateAccount = useUpdateBankAccount();

  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      name: account?.name || '',
      bank_name: account?.bank_name || '',
      iban: account?.iban || '',
      bic: account?.bic || '',
      account_holder: account?.account_holder || '',
      is_active: account?.is_active ?? true,
    },
  });

  const handleSubmit = async (values: BankAccountFormValues) => {
    const input: BankAccountInput = {
      name: values.name,
      bank_name: values.bank_name,
      iban: values.iban.replace(/\s/g, '').toUpperCase(),
      bic: values.bic,
      account_holder: values.account_holder,
      is_active: values.is_active,
    };

    if (account) {
      await updateAccount.mutateAsync({ id: account.id, ...input });
    } else {
      await createAccount.mutateAsync(input);
    }
    onOpenChange(false);
  };

  const isLoading = createAccount.isPending || updateAccount.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{account ? 'Modifier le compte' : 'Nouveau compte bancaire'}</DialogTitle>
          <DialogDescription>
            Configurez les informations bancaires pour vos factures
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du compte</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Compte principal" {...field} />
                  </FormControl>
                  <FormDescription>
                    Nom descriptif pour identifier ce compte
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bank_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banque</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de la banque" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_holder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulaire</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du titulaire" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="FR76 1234 5678 9012 3456 7890 123" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
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
                  <FormLabel>BIC / SWIFT (optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="BNPAFRPP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Compte actif</FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {account ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function BankAccountsManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | undefined>();
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const { data: accounts, isLoading } = useBankAccounts();
  const deleteAccount = useDeleteBankAccount();
  const setDefault = useSetDefaultBankAccount();

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deletingAccountId) {
      await deleteAccount.mutateAsync(deletingAccountId);
      setDeletingAccountId(null);
    }
  };

  const handleSetDefault = (account: BankAccount) => {
    setDefault.mutate(account.id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
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
                <Building className="h-5 w-5" />
                Comptes bancaires
              </CardTitle>
              <CardDescription>
                Gérez vos comptes bancaires pour les factures
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingAccount(undefined);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau compte
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!accounts || accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Aucun compte bancaire</p>
              <p className="text-xs text-muted-foreground">
                Ajoutez un compte pour vos factures
              </p>
            </div>
          ) : (
            accounts.map((account) => (
              <BankAccountCard
                key={account.id}
                account={account}
                onEdit={() => handleEdit(account)}
                onDelete={() => setDeletingAccountId(account.id)}
                onSetDefault={() => handleSetDefault(account)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <BankAccountFormDialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingAccount(undefined);
        }}
        account={editingAccount}
      />

      <AlertDialog open={!!deletingAccountId} onOpenChange={() => setDeletingAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les factures utilisant ce compte ne seront pas affectées.
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
