import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Eye, Pencil, Trash2, Landmark } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { BankAccount } from '@/hooks/useBankAccounts';

interface BankAccountsTableProps {
  accounts: BankAccount[];
  isLoading: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

export function BankAccountsTable({
  accounts,
  isLoading,
  onView,
  onEdit,
  onDelete,
}: BankAccountsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  const handleDeleteClick = (account: BankAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (accountToDelete) {
      onDelete(accountToDelete.id);
    }
    setDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Aucun compte bancaire</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Ajoutez votre premier compte bancaire pour commencer
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom du compte</TableHead>
            <TableHead className="hidden sm:table-cell">Banque</TableHead>
            <TableHead className="hidden md:table-cell">IBAN</TableHead>
            <TableHead className="text-right">Solde</TableHead>
            <TableHead className="hidden sm:table-cell">Statut</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
      <TableBody>
        {accounts.map((account) => (
          <TableRow
            key={account.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onView(account.id)}
          >
            <TableCell className="font-medium">{account.name}</TableCell>
            <TableCell className="hidden sm:table-cell">{account.bank_name || '-'}</TableCell>
            <TableCell className="hidden md:table-cell font-mono text-sm">
              {account.iban
                ? `${account.iban.substring(0, 4)}...${account.iban.slice(-4)}`
                : '-'}
            </TableCell>
            <TableCell className="text-right font-medium">
              <span
                className={
                  account.current_balance >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {formatPrice(account.current_balance)}
              </span>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Badge variant={account.is_active ? 'default' : 'secondary'}>
                {account.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(account.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Voir
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(account.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => handleDeleteClick(account, e)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte bancaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le compte "{accountToDelete?.name}" ?
              Cette action est irréversible et supprimera également toutes les transactions associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

