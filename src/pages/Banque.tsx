import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Landmark, ArrowUpDown, CircleDollarSign, CheckCircle2 } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useBankTransactions } from '@/hooks/useBankTransactions';
import { BankAccountsTable } from '@/components/bank/BankAccountsTable';
import { BankAccountForm } from '@/components/bank/BankAccountForm';
import { BankAccountDetails } from '@/components/bank/BankAccountDetails';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

const Banque = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  const { bankAccounts, isLoading, deleteBankAccount } = useBankAccounts();
  const { unreconciledCount, totalCredits, totalDebits } = useBankTransactions();

  // Calculer le solde total côté client (initial + crédits - débits)
  const totalInitialBalance = bankAccounts
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + (a.initial_balance || 0), 0);
  const calculatedTotalBalance = totalInitialBalance + totalCredits - totalDebits;

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const handleEditAccount = (id: string) => {
    setEditingAccount(id);
    setShowForm(true);
  };

  const handleViewAccount = (id: string) => {
    setSelectedAccountId(id);
  };

  const handleCloseDetails = () => {
    setSelectedAccountId(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Banque</h1>
            <p className="text-muted-foreground">
              Gérez vos comptes bancaires et transactions
            </p>
          </div>
          <Button onClick={handleCreateAccount}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un compte
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solde total</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${calculatedTotalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPrice(calculatedTotalBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {bankAccounts.filter(a => a.is_active).length} compte(s) actif(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entrées</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{formatPrice(totalCredits)}
              </div>
              <p className="text-xs text-muted-foreground">Ce mois</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sorties</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{formatPrice(totalDebits)}
              </div>
              <p className="text-xs text-muted-foreground">Ce mois</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">À rapprocher</CardTitle>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreconciledCount}</div>
              <p className="text-xs text-muted-foreground">Transactions non rapprochées</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {selectedAccountId ? (
          <BankAccountDetails
            accountId={selectedAccountId}
            onClose={handleCloseDetails}
            onEdit={() => handleEditAccount(selectedAccountId)}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Comptes bancaires</CardTitle>
              <CardDescription>
                Liste de vos comptes bancaires et leur solde actuel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BankAccountsTable
                accounts={bankAccounts}
                isLoading={isLoading}
                onView={handleViewAccount}
                onEdit={handleEditAccount}
                onDelete={(id) => deleteBankAccount.mutate(id)}
              />
            </CardContent>
          </Card>
        )}

        {/* Form Modal */}
        <BankAccountForm
          open={showForm}
          onOpenChange={handleFormClose}
          accountId={editingAccount}
        />
      </div>
    </AppLayout>
  );
};

export default Banque;

