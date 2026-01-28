import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useQuotes, useDeleteQuote, useUpdateQuoteStatus, QuoteStatus, calculateMargins, type QuoteLineWithCost } from '@/hooks/useQuotes';
import { useCreateInvoiceFromQuote } from '@/hooks/useInvoices';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { QuoteForm } from './QuoteForm';
import { QuoteDetails } from './QuoteDetails';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Plus,
  FileText,
  Send,
  Check,
  X,
  Clock,
  Search,
  Download,
  Receipt,
} from 'lucide-react';

const STATUS_CONFIG: Record<QuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  sent: { label: 'Envoyé', variant: 'default' },
  accepted: { label: 'Accepté', variant: 'outline' },
  rejected: { label: 'Refusé', variant: 'destructive' },
  expired: { label: 'Expiré', variant: 'secondary' },
};

export const QuotesTable = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);

  const { data: quotes, isLoading } = useQuotes({ status: statusFilter, search });
  const deleteQuote = useDeleteQuote();
  const updateStatus = useUpdateQuoteStatus();
  const createInvoiceFromQuote = useCreateInvoiceFromQuote();
  const { data: permissions } = useCurrentUserPermissions();
  const canViewMargins = permissions?.can_view_margins ?? false;

  // Fonction pour calculer la marge d'un devis
  const getQuoteMargin = (quote: any) => {
    if (!quote.quote_lines || quote.quote_lines.length === 0) return null;
    const lines = quote.quote_lines as QuoteLineWithCost[];
    const margins = calculateMargins(lines);
    if (margins.totalMargin === 0 && margins.lines.length === 0) return null;
    return margins;
  };

  const handleCreate = () => {
    setSelectedQuoteId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setIsFormOpen(true);
  };

  const handleView = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setIsDetailsOpen(true);
  };

  const handleDelete = (quoteId: string) => {
    setQuoteToDelete(quoteId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (quoteToDelete) {
      deleteQuote.mutate(quoteToDelete);
      setIsDeleteDialogOpen(false);
      setQuoteToDelete(null);
    }
  };

  const handleStatusChange = (quoteId: string, status: QuoteStatus) => {
    updateStatus.mutate({ id: quoteId, status });
  };

  const handleConvertToInvoice = (quoteId: string) => {
    createInvoiceFromQuote.mutate(quoteId, {
      onSuccess: () => {
        navigate('/factures');
      },
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const getContactName = (quote: any) => {
    if (!quote.contact) return '-';
    if (quote.contact.company_name) return quote.contact.company_name;
    return `${quote.contact.first_name || ''} ${quote.contact.last_name || ''}`.trim() || '-';
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
            onValueChange={(value) => setStatusFilter(value as QuoteStatus | 'all')}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="accepted">Accepté</SelectItem>
              <SelectItem value="rejected">Refusé</SelectItem>
              <SelectItem value="expired">Expiré</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreate} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau devis
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden md:table-cell">Sujet</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              {canViewMargins && <TableHead className="text-right hidden lg:table-cell">Marge</TableHead>}
              <TableHead className="text-right">Total</TableHead>
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
                  {canViewMargins && <TableCell><Skeleton className="h-4 w-20" /></TableCell>}
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : !quotes?.length ? (
              <TableRow>
                <TableCell colSpan={canViewMargins ? 8 : 7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-8 w-8" />
                    <p>Aucun devis trouvé</p>
                    <Button variant="outline" size="sm" onClick={handleCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Créer un devis
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">
                    <button
                      onClick={() => handleView(quote.id)}
                      className="text-primary hover:underline font-medium text-left"
                    >
                      {quote.number}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate">
                    {quote.contact ? (
                      <button
                        onClick={() => navigate('/clients')}
                        className="text-primary hover:underline text-left"
                      >
                        {getContactName(quote)}
                      </button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate hidden md:table-cell">
                    {quote.subject || '-'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {format(new Date(quote.date), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  {canViewMargins && (
                    <TableCell className="text-right hidden lg:table-cell">
                      {(() => {
                        const margins = getQuoteMargin(quote);
                        if (!margins) return <span className="text-muted-foreground">-</span>;
                        return (
                          <span className={margins.totalMargin >= 0 ? 'text-green-600' : 'text-destructive'}>
                            {formatPrice(margins.totalMargin)}
                          </span>
                        );
                      })()}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium">
                    {formatPrice(quote.total || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[quote.status as QuoteStatus]?.variant || 'secondary'}>
                      {STATUS_CONFIG[quote.status as QuoteStatus]?.label || quote.status}
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
                        <DropdownMenuItem onClick={() => handleView(quote.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(quote.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {quote.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'sent')}>
                            <Send className="mr-2 h-4 w-4" />
                            Marquer envoyé
                          </DropdownMenuItem>
                        )}
                        {quote.status === 'sent' && (
                          <>
                            <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'accepted')}>
                              <Check className="mr-2 h-4 w-4" />
                              Marquer accepté
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(quote.id, 'rejected')}>
                              <X className="mr-2 h-4 w-4" />
                              Marquer refusé
                            </DropdownMenuItem>
                          </>
                        )}
                        {quote.status === 'accepted' && (
                          <DropdownMenuItem 
                            onClick={() => handleConvertToInvoice(quote.id)}
                            disabled={createInvoiceFromQuote.isPending}
                          >
                            <Receipt className="mr-2 h-4 w-4" />
                            Convertir en facture
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(quote.id)}
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

      <QuoteForm
        quoteId={selectedQuoteId}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <QuoteDetails
        quoteId={selectedQuoteId}
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
            <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le devis sera définitivement supprimé.
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
