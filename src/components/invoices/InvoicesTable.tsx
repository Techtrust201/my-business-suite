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
import { useInvoices, useDeleteInvoice, useUpdateInvoiceStatus, InvoiceStatus } from '@/hooks/useInvoices';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceDetails } from './InvoiceDetails';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Plus,
  Receipt,
  Send,
  Check,
  X,
  Search,
  CreditCard,
} from 'lucide-react';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyée', variant: 'default' },
  viewed: { label: 'Vue', variant: 'default' },
  paid: { label: 'Payée', variant: 'outline' },
  partially_paid: { label: 'Partielle', variant: 'default' },
  overdue: { label: 'En retard', variant: 'destructive' },
  cancelled: { label: 'Annulée', variant: 'secondary' },
};

export const InvoicesTable = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const { data: invoices, isLoading } = useInvoices({ status: statusFilter, search });
  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const { canCreateInvoices } = useCurrentUserPermissions();

  const handleCreate = () => {
    setSelectedInvoiceId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setIsFormOpen(true);
  };

  const handleView = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setIsDetailsOpen(true);
  };

  const handleDelete = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteInvoice.mutate(invoiceToDelete);
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleStatusChange = (invoiceId: string, status: InvoiceStatus) => {
    updateStatus.mutate({ id: invoiceId, status });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getContactName = (invoice: any) => {
    if (!invoice.contact) return '-';
    if (invoice.contact.company_name) return invoice.contact.company_name;
    return `${invoice.contact.first_name || ''} ${invoice.contact.last_name || ''}`.trim() || '-';
  };

  const getBalanceDue = (invoice: any) => {
    return Number(invoice.total || 0) - Number(invoice.amount_paid || 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par numéro, sujet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as InvoiceStatus | 'all')}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoyée</SelectItem>
              <SelectItem value="paid">Payée</SelectItem>
              <SelectItem value="partial">Partielle</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
              <SelectItem value="cancelled">Annulée</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreate} className="shrink-0" disabled={!canCreateInvoices}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead className="hidden md:table-cell">Échéance</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Solde dû</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : !invoices?.length ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="h-8 w-8" />
                    <p>Aucune facture trouvée</p>
                    <Button variant="outline" size="sm" onClick={handleCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Créer une facture
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell className="max-w-[120px] truncate">{getContactName(invoice)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(new Date(invoice.date), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {invoice.due_date 
                      ? format(new Date(invoice.due_date), 'dd MMM yyyy', { locale: fr })
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(Number(invoice.total) || 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium hidden sm:table-cell">
                    {getBalanceDue(invoice) > 0 ? (
                      <span className="text-destructive">{formatPrice(getBalanceDue(invoice))}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[invoice.status as InvoiceStatus]?.variant || 'secondary'}>
                      {STATUS_CONFIG[invoice.status as InvoiceStatus]?.label || invoice.status}
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
                        <DropdownMenuItem onClick={() => handleView(invoice.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(invoice.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {invoice.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'sent')}>
                            <Send className="mr-2 h-4 w-4" />
                            Marquer envoyée
                          </DropdownMenuItem>
                        )}
                        {(invoice.status === 'sent' || invoice.status === 'partially_paid' || invoice.status === 'overdue' || invoice.status === 'viewed') && (
                          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>
                            <Check className="mr-2 h-4 w-4" />
                            Marquer payée
                          </DropdownMenuItem>
                        )}
                        {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'cancelled')}>
                            <X className="mr-2 h-4 w-4" />
                            Annuler
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(invoice.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceForm
        invoiceId={selectedInvoiceId}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <InvoiceDetails
        invoiceId={selectedInvoiceId}
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
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La facture sera définitivement supprimée.
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
