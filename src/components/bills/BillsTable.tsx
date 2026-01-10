import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBills, useDeleteBill, useUpdateBillStatus, BillStatus } from '@/hooks/useBills';
import { BillForm } from './BillForm';
import { BillDetails } from './BillDetails';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Plus,
  ShoppingCart,
  Check,
  Search,
  CreditCard,
} from 'lucide-react';

const STATUS_CONFIG: Record<BillStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  received: { label: 'Reçue', variant: 'default' },
  partially_paid: { label: 'Partiel', variant: 'outline' },
  paid: { label: 'Payée', variant: 'outline' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'secondary' },
};

export const BillsTable = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BillStatus | 'all'>('all');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<string | null>(null);

  const { data: bills, isLoading } = useBills({ status: statusFilter, search });
  const deleteBill = useDeleteBill();
  const updateStatus = useUpdateBillStatus();

  const handleCreate = () => {
    setSelectedBillId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (billId: string) => {
    setSelectedBillId(billId);
    setIsFormOpen(true);
  };

  const handleView = (billId: string) => {
    setSelectedBillId(billId);
    setIsDetailsOpen(true);
  };

  const handleDelete = (billId: string) => {
    setBillToDelete(billId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (billToDelete) {
      deleteBill.mutate(billToDelete);
      setIsDeleteDialogOpen(false);
      setBillToDelete(null);
    }
  };

  const handleStatusChange = (billId: string, status: BillStatus) => {
    updateStatus.mutate({ id: billId, status });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getContactName = (bill: any) => {
    if (!bill.contact) return '-';
    if (bill.contact.company_name) return bill.contact.company_name;
    return `${bill.contact.first_name || ''} ${bill.contact.last_name || ''}`.trim() || '-';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence, sujet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as BillStatus | 'all')}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="received">Reçue</SelectItem>
              <SelectItem value="partially_paid">Partiellement payée</SelectItem>
              <SelectItem value="paid">Payée</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreate} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nouvel achat
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead className="hidden md:table-cell">Sujet</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden lg:table-cell">Échéance</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Reste</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : !bills?.length ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ShoppingCart className="h-8 w-8" />
                    <p>Aucun achat trouvé</p>
                    <Button variant="outline" size="sm" onClick={handleCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un achat
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => {
                const balanceDue = Number(bill.total || 0) - Number(bill.amount_paid || 0);
                return (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">
                      {bill.vendor_reference || bill.number || '-'}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate">{getContactName(bill)}</TableCell>
                    <TableCell className="max-w-[150px] truncate hidden md:table-cell">
                      {bill.subject || '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {format(new Date(bill.date), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {bill.due_date
                        ? format(new Date(bill.due_date), 'dd MMM yyyy', { locale: fr })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(bill.total || 0)}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      {balanceDue > 0 ? (
                        <span className="text-destructive font-medium">
                          {formatPrice(balanceDue)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[bill.status as BillStatus]?.variant || 'secondary'}>
                        {STATUS_CONFIG[bill.status as BillStatus]?.label || bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => handleView(bill.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(bill.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(bill.id, 'paid')}>
                              <Check className="mr-2 h-4 w-4" />
                              Marquer payée
                            </DropdownMenuItem>
                          )}
                          {bill.status === 'paid' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(bill.id, 'received')}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Marquer non payée
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(bill.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <BillForm
        billId={selectedBillId}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <BillDetails
        billId={selectedBillId}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onEdit={() => {
          setIsDetailsOpen(false);
          setIsFormOpen(true);
        }}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet achat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La facture fournisseur sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
