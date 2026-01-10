import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, 
  CreditCard, 
  Building2, 
  Tag, 
  FileText, 
  Receipt, 
  Download,
  ExternalLink,
  Pencil,
  Trash2,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Expense, getCategoryInfo, useDeleteExpense } from '@/hooks/useExpenses';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Carte bancaire',
  cash: 'Espèces',
  bank_transfer: 'Virement',
  check: 'Chèque',
  other: 'Autre',
};

interface ExpenseDetailsProps {
  expense: Expense;
  onEdit?: () => void;
  onClose?: () => void;
}

export function ExpenseDetails({ expense, onEdit, onClose }: ExpenseDetailsProps) {
  const deleteMutation = useDeleteExpense();
  const category = getCategoryInfo(expense.category);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({
      id: expense.id,
      receiptUrl: expense.receipt_url || undefined,
    });
    onClose?.();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge
              variant="secondary"
              className={cn('text-white', category.color)}
            >
              {category.label}
            </Badge>
            {expense.is_reimbursable && (
              <Badge variant="outline">
                <RefreshCcw className="h-3 w-3 mr-1" />
                Remboursable
              </Badge>
            )}
          </div>
          <h2 className="text-2xl font-bold">{formatAmount(expense.amount)}</h2>
          <p className="text-muted-foreground">
            {expense.vendor_name || 'Sans commerce'}
          </p>
        </div>
      </div>

      <Separator />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">
              {format(new Date(expense.date), 'PPP', { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Paiement</p>
            <p className="font-medium">
              {PAYMENT_METHOD_LABELS[expense.payment_method] || expense.payment_method}
            </p>
          </div>
        </div>

        {expense.vendor_name && (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commerce</p>
              <p className="font-medium">{expense.vendor_name}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Tag className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Catégorie</p>
            <p className="font-medium">{category.label}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      {expense.description && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Description</span>
          </div>
          <p className="text-sm">{expense.description}</p>
        </div>
      )}

      {/* Notes */}
      {expense.notes && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="text-sm bg-muted p-3 rounded-lg">{expense.notes}</p>
        </div>
      )}

      {/* Receipt */}
      {expense.receipt_url && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Receipt className="h-4 w-4" />
            <span className="text-sm">Justificatif</span>
          </div>
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            <img
              src={expense.receipt_url}
              alt="Justificatif"
              className="w-full max-h-[300px] object-contain"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href={expense.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={expense.receipt_url} download>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </a>
            </Button>
          </div>
        </div>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onEdit} className="flex-1">
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. La dépense et son justificatif seront
                définitivement supprimés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Metadata */}
      <p className="text-xs text-muted-foreground text-center">
        Créée le {format(new Date(expense.created_at), 'Pp', { locale: fr })}
      </p>
    </div>
  );
}
