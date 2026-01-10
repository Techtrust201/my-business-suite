import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Pencil,
  Upload,
  Landmark,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
} from 'lucide-react';
import { useBankAccount } from '@/hooks/useBankAccounts';
import { useBankTransactions } from '@/hooks/useBankTransactions';
import { TransactionsTable } from './TransactionsTable';
import { ImportTransactionsModal } from './ImportTransactionsModal';
import { ReconciliationPanel } from './ReconciliationPanel';
import { Skeleton } from '@/components/ui/skeleton';
import type { BankTransaction } from '@/hooks/useBankTransactions';

interface BankAccountDetailsProps {
  accountId: string;
  onClose: () => void;
  onEdit: () => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

export function BankAccountDetails({
  accountId,
  onClose,
  onEdit,
}: BankAccountDetailsProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [transactionToReconcile, setTransactionToReconcile] =
    useState<BankTransaction | null>(null);

  const { data: account, isLoading: isLoadingAccount } = useBankAccount(accountId);
  const {
    transactions,
    isLoading: isLoadingTransactions,
    totalCredits,
    totalDebits,
    unreconciledCount,
    unreconcileTransaction,
  } = useBankTransactions({ bankAccountId: accountId });

  // Calculer le solde réel côté client (initial + crédits - débits)
  const calculatedBalance = (account?.initial_balance || 0) + totalCredits - totalDebits;

  if (isLoadingAccount) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p>Compte non trouvé</p>
        <Button onClick={onClose} className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  const handleReconcile = (transaction: BankTransaction) => {
    setTransactionToReconcile(transaction);
  };

  const handleUnreconcile = (transactionId: string) => {
    unreconcileTransaction.mutate(transactionId);
  };

  const handleCloseReconciliation = () => {
    setTransactionToReconcile(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{account.name}</h2>
              <Badge variant={account.is_active ? 'default' : 'secondary'}>
                {account.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {account.bank_name}
              {account.iban && ` • ${account.iban.substring(0, 4)}...${account.iban.slice(-4)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importer
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde actuel</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                calculatedBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatPrice(calculatedBalance)}
            </div>
            {account.initial_balance !== 0 && (
              <p className="text-xs text-muted-foreground">
                Solde initial: {formatPrice(account.initial_balance || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entrées</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{formatPrice(totalCredits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sorties</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -{formatPrice(totalDebits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À rapprocher</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreconciledCount}</div>
            <p className="text-xs text-muted-foreground">transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Historique des transactions de ce compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable
            transactions={transactions}
            isLoading={isLoadingTransactions}
            onReconcile={handleReconcile}
            onUnreconcile={handleUnreconcile}
          />
        </CardContent>
      </Card>

      {/* Import Modal */}
      <ImportTransactionsModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        bankAccountId={accountId}
      />

      {/* Reconciliation Panel */}
      {transactionToReconcile && (
        <ReconciliationPanel
          transaction={transactionToReconcile}
          onClose={handleCloseReconciliation}
        />
      )}
    </div>
  );
}

