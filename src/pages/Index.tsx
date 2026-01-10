import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { useDashboardStats, useRecentActivity } from '@/hooks/useDashboardStats';
import { useRevenueChart, useUnpaidInvoicesChart } from '@/hooks/useRevenueChart';
import { useInvoiceStatusChart, useTopClients } from '@/hooks/useInvoiceStatusChart';
import { useDashboardRealtime } from '@/hooks/useRealtimeSubscription';
import { useAccountingKpis, useTreasuryTrend } from '@/hooks/useAccountingKpis';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Receipt, Users, TrendingUp, TrendingDown, Plus, ArrowRight, Wallet, Calculator, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

const Index = () => {
  const navigate = useNavigate();
  const { loading, needsOnboarding } = useOrganization();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity();
  const { data: revenueData, isLoading: revenueLoading } = useRevenueChart();
  const { data: unpaidData, isLoading: unpaidLoading } = useUnpaidInvoicesChart();
  const { data: statusData, isLoading: statusLoading } = useInvoiceStatusChart();
  const { data: topClients, isLoading: topClientsLoading } = useTopClients(5);
  const { data: accountingKpis, isLoading: accountingLoading } = useAccountingKpis();
  const { data: treasuryTrend } = useTreasuryTrend();

  // Enable realtime updates
  useDashboardRealtime();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsOnboarding) {
    navigate('/onboarding');
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k €`;
    }
    return `${value.toFixed(0)} €`;
  };

  const getStatusBadge = (status: string, type: 'invoice' | 'quote') => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      sent: { label: 'Envoyé', variant: 'default' },
      paid: { label: 'Payé', variant: 'default' },
      accepted: { label: 'Accepté', variant: 'default' },
      rejected: { label: 'Refusé', variant: 'destructive' },
      overdue: { label: 'En retard', variant: 'destructive' },
      cancelled: { label: 'Annulé', variant: 'outline' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const chartConfig = {
    revenue: {
      label: 'Chiffre d\'affaires',
      color: 'hsl(var(--primary))',
    },
    unpaid: {
      label: 'Impayées',
      color: 'hsl(0, 84%, 60%)',
    },
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Tableau de bord</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Vue d'ensemble de votre activité
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/devis')} className="flex-1 sm:flex-none" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Nouveau </span>devis
            </Button>
            <Button onClick={() => navigate('/factures')} className="flex-1 sm:flex-none" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Nouvelle </span>facture
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
              <CardDescription className="text-xs sm:text-sm">CA (mois)</CardDescription>
              {stats?.revenueChange !== undefined && stats.revenueChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <div className="text-lg sm:text-2xl font-bold tabular-nums">
                    {formatCurrency(stats?.monthlyRevenue || 0)}
                  </div>
                  <p className={`text-xs hidden sm:block ${(stats?.revenueChange || 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                    {(stats?.revenueChange || 0) >= 0 ? '+' : ''}{stats?.revenueChange || 0}% vs mois dernier
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
              <CardDescription className="text-xs sm:text-sm">En attente</CardDescription>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <div className="text-lg sm:text-2xl font-bold tabular-nums">
                    {stats?.pendingInvoicesCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {formatCurrency(stats?.pendingInvoicesAmount || 0)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
              <CardDescription className="text-xs sm:text-sm">Trésorerie</CardDescription>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              {accountingLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <div className={`text-lg sm:text-2xl font-bold tabular-nums ${(accountingKpis?.totalTreasury || 0) >= 0 ? '' : 'text-destructive'}`}>
                    {formatCurrency(accountingKpis?.totalTreasury || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Solde banque + caisse
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
              <CardDescription className="text-xs sm:text-sm">Résultat</CardDescription>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-3 sm:pb-4">
              {accountingLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <div className={`text-lg sm:text-2xl font-bold tabular-nums ${(accountingKpis?.monthlyResult || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(accountingKpis?.monthlyResult || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Produits - Charges
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Accounting KPIs Row */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>TVA à payer</CardDescription>
            </CardHeader>
            <CardContent>
              {accountingLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xl font-bold tabular-nums ${(accountingKpis?.vatToPay || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(accountingKpis?.vatToPay || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Collectée: {formatCurrency(accountingKpis?.vatCollected || 0)} | Déductible: {formatCurrency(accountingKpis?.vatDeductible || 0)}
                    </p>
                  </div>
                  <Calculator className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Flux du mois</CardDescription>
            </CardHeader>
            <CardContent>
              {accountingLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-green-600">
                      +{formatCurrency(accountingKpis?.monthlyReceipts || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Encaissements</p>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-600">
                      -{formatCurrency(accountingKpis?.monthlyDisbursements || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Décaissements</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Résultat annuel (YTD)</CardDescription>
            </CardHeader>
            <CardContent>
              {accountingLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-xl font-bold tabular-nums ${(accountingKpis?.ytdResult || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(accountingKpis?.ytdResult || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      CA: {formatCurrency(accountingKpis?.ytdRevenue || 0)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Évolution du chiffre d'affaires</CardTitle>
              <CardDescription>12 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : revenueData && revenueData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="monthLabel"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickFormatter={formatCompactCurrency}
                      width={50}
                      className="hidden sm:block"
                      hide={window.innerWidth < 640}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Aucune donnée de chiffre d'affaires
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unpaid Invoices Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Factures impayées</CardTitle>
              <CardDescription>Par mois de création</CardDescription>
            </CardHeader>
            <CardContent>
              {unpaidLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : unpaidData && unpaidData.some(d => d.unpaidAmount > 0) ? (
                <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
                  <BarChart data={unpaidData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="monthLabel"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickFormatter={formatCompactCurrency}
                      width={60}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      }
                    />
                    <Bar
                      dataKey="unpaidAmount"
                      fill="hsl(0, 84%, 60%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Receipt className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Aucune facture impayée 🎉
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Chart & Top Clients */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Invoice Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition des factures</CardTitle>
              <CardDescription>Par statut</CardDescription>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : statusData && statusData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <div className="h-[200px] w-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {statusData.map((entry) => (
                      <div key={entry.status} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm">
                          {entry.label}: <span className="font-medium">{entry.count}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Aucune facture créée
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top clients</CardTitle>
              <CardDescription>Par chiffre d'affaires (factures payées)</CardDescription>
            </CardHeader>
            <CardContent>
              {topClientsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : topClients && topClients.length > 0 ? (
                <div className="space-y-3">
                  {topClients.map((client, index) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/clients')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{client.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {client.invoiceCount} facture{client.invoiceCount > 1 ? 's' : ''} payée{client.invoiceCount > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-medium tabular-nums text-primary">
                        {formatCurrency(client.totalRevenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Aucun client avec factures payées
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
              <CardDescription>Accès aux fonctionnalités principales</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-between" onClick={() => navigate('/clients')}>
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Ajouter un client
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="justify-between" onClick={() => navigate('/devis')}>
                <span className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  Créer un devis
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="justify-between" onClick={() => navigate('/factures')}>
                <span className="flex items-center">
                  <Receipt className="mr-2 h-4 w-4" />
                  Créer une facture
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>Dernières actions sur votre compte</CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(activity.type === 'invoice' ? '/factures' : '/devis')}
                    >
                      <div className="flex items-center gap-3">
                        {activity.type === 'invoice' ? (
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium text-sm">
                            {activity.type === 'invoice' ? 'Facture' : 'Devis'} {activity.number}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activity.contact_name || 'Sans client'} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: fr })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium tabular-nums">
                          {formatCurrency(activity.total)}
                        </span>
                        {getStatusBadge(activity.status, activity.type)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Aucune activité récente
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vos dernières factures et devis apparaîtront ici
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
