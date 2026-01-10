import { useState } from 'react';
import { Plus, Receipt, RefreshCcw, TrendingDown, Filter } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpensesTable } from '@/components/expenses/ExpensesTable';
import { ExpenseDetails } from '@/components/expenses/ExpenseDetails';
import {
  useExpenses,
  useExpenseStats,
  Expense,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
} from '@/hooks/useExpenses';

export default function Depenses() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);

  const { data: expenses = [], isLoading } = useExpenses({
    category: categoryFilter !== 'all' ? categoryFilter as ExpenseCategory : undefined,
    search: search || undefined,
  });

  const { data: stats } = useExpenseStats();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleCreateSuccess = () => {
    setShowCreateDialog(false);
  };

  const handleEditSuccess = () => {
    setEditingExpense(null);
    setViewingExpense(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dépenses</h1>
            <p className="text-muted-foreground">
              Gérez vos dépenses et scannez vos tickets
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle dépense
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total du mois</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(stats?.totalMonth || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.expenseCount || 0} dépense{(stats?.expenseCount || 0) > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">À rembourser</CardTitle>
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatAmount(stats?.reimbursableAmount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Frais remboursables
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Justificatifs</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses.filter(e => e.receipt_url).length}
              </div>
              <p className="text-xs text-muted-foreground">
                sur {expenses.length} dépenses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Rechercher par description ou commerce..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <ExpensesTable
          expenses={expenses}
          isLoading={isLoading}
          onView={setViewingExpense}
          onEdit={setEditingExpense}
        />
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle dépense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la dépense</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            expense={editingExpense}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingExpense(null)}
          />
        </DialogContent>
      </Dialog>

      {/* View Sheet */}
      <Sheet open={!!viewingExpense} onOpenChange={() => setViewingExpense(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détails de la dépense</SheetTitle>
          </SheetHeader>
          {viewingExpense && (
            <div className="mt-6">
              <ExpenseDetails
                expense={viewingExpense}
                onEdit={() => {
                  setEditingExpense(viewingExpense);
                }}
                onClose={() => setViewingExpense(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
