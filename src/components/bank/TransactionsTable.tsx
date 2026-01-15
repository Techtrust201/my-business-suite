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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Link,
  Unlink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { BankTransaction } from '@/hooks/useBankTransactions';

interface TransactionsTableProps {
  transactions: BankTransaction[];
  isLoading: boolean;
  onReconcile?: (transaction: BankTransaction) => void;
  onUnreconcile?: (transactionId: string) => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function TransactionsTable({
  transactions,
  isLoading,
  onReconcile,
  onUnreconcile,
}: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReconciled, setFilterReconciled] = useState<string>('all');

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterReconciled === 'all' ||
      (filterReconciled === 'reconciled' && t.is_reconciled) ||
      (filterReconciled === 'unreconciled' && !t.is_reconciled);
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterReconciled} onValueChange={setFilterReconciled}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="unreconciled">À rapprocher</SelectItem>
            <SelectItem value="reconciled">Rapprochées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Circle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Aucune transaction</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Importez vos transactions bancaires pour commencer
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="hidden sm:table-cell text-center">Statut</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="text-sm">
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {transaction.type === 'credit' ? (
                      <ArrowDownCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <span className="truncate max-w-[150px] sm:max-w-[250px]">
                      {transaction.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {transaction.category ? (
                    <Badge variant="outline">{transaction.category}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span
                    className={
                      transaction.type === 'credit'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatPrice(Math.abs(transaction.amount))}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-center">
                  {transaction.is_reconciled ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span className="hidden md:inline">Rapproché</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Circle className="h-3 w-3" />
                      <span className="hidden md:inline">À rapprocher</span>
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!transaction.is_reconciled ? (
                        <DropdownMenuItem
                          onClick={() => onReconcile?.(transaction)}
                        >
                          <Link className="mr-2 h-4 w-4" />
                          Rapprocher
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => onUnreconcile?.(transaction.id)}
                        >
                          <Unlink className="mr-2 h-4 w-4" />
                          Annuler le rapprochement
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      )}
    </div>
}

