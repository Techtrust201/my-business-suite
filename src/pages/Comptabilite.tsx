import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Search, BookOpen, FileSpreadsheet, Calculator, ChevronRight, ChevronDown, AlertCircle, Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  useChartOfAccounts, 
  useInitChartOfAccounts, 
  groupAccountsByClass,
  ChartAccount 
} from '@/hooks/useChartOfAccounts';
import { useJournalEntries, useTrialBalance } from '@/hooks/useJournalEntries';
import { useAccountingKpis, useTreasuryTrend } from '@/hooks/useAccountingKpis';
import { ChartOfAccountsTree } from '@/components/accounting/ChartOfAccountsTree';
import { JournalEntryForm } from '@/components/accounting/JournalEntryForm';
import { GeneralLedgerView } from '@/components/accounting/GeneralLedgerView';

const Comptabilite = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEntryForm, setShowEntryForm] = useState(false);

  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const { data: journalEntries, isLoading: entriesLoading } = useJournalEntries();
  const { data: trialBalance, isLoading: balanceLoading } = useTrialBalance();
  const { data: kpis, isLoading: kpisLoading } = useAccountingKpis();
  const { data: treasuryTrend } = useTreasuryTrend();
  const initChartOfAccounts = useInitChartOfAccounts();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const needsInit = !accountsLoading && (!accounts || accounts.length === 0);

  const getJournalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sales: 'Ventes',
      purchases: 'Achats',
      bank: 'Banque',
      general: 'Opérations diverses',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      posted: { label: 'Validée', variant: 'default' },
      draft: { label: 'Brouillon', variant: 'secondary' },
      cancelled: { label: 'Annulée', variant: 'destructive' },
    };
    const { label, variant } = config[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Filter journal entries
  const filteredEntries = (journalEntries || []).filter(entry =>
    entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Comptabilité</h1>
            <p className="text-muted-foreground">
              Plan comptable, écritures et grand livre
            </p>
          </div>
          {!needsInit && (
            <Dialog open={showEntryForm} onOpenChange={setShowEntryForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle écriture
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nouvelle écriture comptable</DialogTitle>
                  <DialogDescription>
                    Saisissez une écriture manuelle dans le journal des opérations diverses
                  </DialogDescription>
                </DialogHeader>
                <JournalEntryForm onSuccess={() => setShowEntryForm(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {needsInit ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Plan comptable non initialisé
              </CardTitle>
              <CardDescription>
                Votre plan comptable n'a pas encore été créé. Initialisez-le pour commencer à utiliser la comptabilité.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Le Plan Comptable Général (PCG) français sera créé avec tous les comptes standards :
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>Classe 1 : Capitaux</li>
                  <li>Classe 2 : Immobilisations</li>
                  <li>Classe 3 : Stocks</li>
                  <li>Classe 4 : Tiers (Clients, Fournisseurs, TVA)</li>
                  <li>Classe 5 : Financier (Banque, Caisse)</li>
                  <li>Classe 6 : Charges</li>
                  <li>Classe 7 : Produits</li>
                </ul>
                <Button 
                  onClick={() => initChartOfAccounts.mutate()}
                  disabled={initChartOfAccounts.isPending}
                >
                  {initChartOfAccounts.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Initialiser le Plan Comptable
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Tableau de bord
              </TabsTrigger>
              <TabsTrigger value="plan-comptable" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Plan comptable
              </TabsTrigger>
              <TabsTrigger value="journaux" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Journaux
              </TabsTrigger>
              <TabsTrigger value="grand-livre" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Grand livre
              </TabsTrigger>
              <TabsTrigger value="balance" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Balance
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="mt-6 space-y-6">
              {/* KPIs Row */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription>Encaissements (mois)</CardDescription>
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    {kpisLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="text-2xl font-bold tabular-nums text-green-600">
                        {formatCurrency(kpis?.monthlyReceipts || 0)}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription>Décaissements (mois)</CardDescription>
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    {kpisLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="text-2xl font-bold tabular-nums text-red-600">
                        {formatCurrency(kpis?.monthlyDisbursements || 0)}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription>Solde du mois</CardDescription>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {kpisLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className={`text-2xl font-bold tabular-nums ${(kpis?.monthlyBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(kpis?.monthlyBalance || 0)}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardDescription>Trésorerie totale</CardDescription>
                    <Wallet className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    {kpisLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <div className={`text-2xl font-bold tabular-nums ${(kpis?.totalTreasury || 0) >= 0 ? '' : 'text-red-600'}`}>
                          {formatCurrency(kpis?.totalTreasury || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Banque: {formatCurrency(kpis?.bankBalance || 0)}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Second Row: TVA, Results */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">TVA à payer</CardTitle>
                    <CardDescription>Position TVA actuelle</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {kpisLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">TVA collectée</span>
                          <span className="font-medium tabular-nums">{formatCurrency(kpis?.vatCollected || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">TVA déductible</span>
                          <span className="font-medium tabular-nums">- {formatCurrency(kpis?.vatDeductible || 0)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-medium">TVA à payer</span>
                          <span className={`font-bold tabular-nums ${(kpis?.vatToPay || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(kpis?.vatToPay || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Résultat du mois</CardTitle>
                    <CardDescription>Produits - Charges</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {kpisLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Produits (CA)</span>
                          <span className="font-medium tabular-nums text-green-600">{formatCurrency(kpis?.monthlyRevenue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Charges</span>
                          <span className="font-medium tabular-nums text-red-600">- {formatCurrency(kpis?.monthlyExpenses || 0)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-medium">Résultat</span>
                          <span className={`font-bold tabular-nums ${(kpis?.monthlyResult || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(kpis?.monthlyResult || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cumul annuel</CardTitle>
                    <CardDescription>Depuis le 1er janvier</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {kpisLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">CA cumulé</span>
                          <span className="font-medium tabular-nums">{formatCurrency(kpis?.ytdRevenue || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Charges cumulées</span>
                          <span className="font-medium tabular-nums">- {formatCurrency(kpis?.ytdExpenses || 0)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-medium">Résultat YTD</span>
                          <span className={`font-bold tabular-nums ${(kpis?.ytdResult || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(kpis?.ytdResult || 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Cash Flow Trend */}
              {treasuryTrend && treasuryTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Évolution des flux de trésorerie</CardTitle>
                    <CardDescription>Encaissements et décaissements sur 6 mois</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {treasuryTrend.map((month) => (
                        <div key={month.month} className="flex items-center gap-4">
                          <div className="w-12 text-sm font-medium">{month.monthLabel}</div>
                          <div className="flex-1 flex items-center gap-2">
                            <div 
                              className="h-6 bg-green-500/20 rounded"
                              style={{ width: `${Math.min((month.receipts / Math.max(...treasuryTrend.map(t => Math.max(t.receipts, t.disbursements)))) * 100, 100)}%`, minWidth: month.receipts > 0 ? '4px' : '0' }}
                            />
                            <span className="text-xs text-green-600 tabular-nums min-w-[80px]">
                              +{formatCurrency(month.receipts)}
                            </span>
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <div 
                              className="h-6 bg-red-500/20 rounded"
                              style={{ width: `${Math.min((month.disbursements / Math.max(...treasuryTrend.map(t => Math.max(t.receipts, t.disbursements)))) * 100, 100)}%`, minWidth: month.disbursements > 0 ? '4px' : '0' }}
                            />
                            <span className="text-xs text-red-600 tabular-nums min-w-[80px]">
                              -{formatCurrency(month.disbursements)}
                            </span>
                          </div>
                          <div className={`text-sm font-medium tabular-nums min-w-[100px] text-right ${month.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {month.balance >= 0 ? '+' : ''}{formatCurrency(month.balance)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Plan Comptable Tab */}
            <TabsContent value="plan-comptable" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Plan Comptable Général</CardTitle>
                  <CardDescription>
                    Liste des comptes comptables organisés par classe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <ChartOfAccountsTree accounts={accounts || []} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Journaux Tab */}
            <TabsContent value="journaux" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Écritures comptables</CardTitle>
                      <CardDescription>
                        Historique de toutes les écritures
                      </CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {entriesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Aucune écriture comptable</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Les écritures seront générées automatiquement lors de la création de factures
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Écriture</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Journal</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="font-mono text-sm">
                              {entry.entry_number}
                            </TableCell>
                            <TableCell>
                              {format(new Date(entry.date), 'dd/MM/yyyy', { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getJournalTypeLabel(entry.journal_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate">
                              {entry.description}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(entry.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Grand Livre Tab */}
            <TabsContent value="grand-livre" className="mt-6">
              <GeneralLedgerView />
            </TabsContent>

            {/* Balance Tab */}
            <TabsContent value="balance" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Balance générale</CardTitle>
                  <CardDescription>
                    Soldes de tous les comptes mouvementés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {balanceLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !trialBalance || trialBalance.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Calculator className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Aucun mouvement comptable</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>N° Compte</TableHead>
                            <TableHead>Intitulé</TableHead>
                            <TableHead className="text-right">Total Débit</TableHead>
                            <TableHead className="text-right">Total Crédit</TableHead>
                            <TableHead className="text-right">Solde Débit</TableHead>
                            <TableHead className="text-right">Solde Crédit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trialBalance.map((account: any) => (
                            <TableRow key={account.id}>
                              <TableCell className="font-mono text-sm">
                                {account.account_number}
                              </TableCell>
                              <TableCell>{account.name}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(account.total_debit)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(account.total_credit)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium">
                                {account.solde_debit > 0 ? formatCurrency(account.solde_debit) : '-'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium">
                                {account.solde_credit > 0 ? formatCurrency(account.solde_credit) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4 flex justify-end gap-8 border-t pt-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Soldes Débit</p>
                          <p className="text-lg font-bold tabular-nums">
                            {formatCurrency(trialBalance.reduce((sum: number, a: any) => sum + a.solde_debit, 0))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Soldes Crédit</p>
                          <p className="text-lg font-bold tabular-nums">
                            {formatCurrency(trialBalance.reduce((sum: number, a: any) => sum + a.solde_credit, 0))}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default Comptabilite;
