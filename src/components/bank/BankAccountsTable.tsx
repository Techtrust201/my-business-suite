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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { BankAccount } from '@/hooks/useBankAccounts';

interface BankAccountsTableProps {
  accounts: BankAccount[];
  isLoading: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
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
}: BankAccountsTableProps) {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom du compte</TableHead>
          <TableHead>Banque</TableHead>
          <TableHead>IBAN</TableHead>
          <TableHead className="text-right">Solde</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="w-[80px]"></TableHead>
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
            <TableCell>{account.bank_name || '-'}</TableCell>
            <TableCell className="font-mono text-sm">
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
            <TableCell>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

