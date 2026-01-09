import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { useDashboardStats, useRecentActivity } from '@/hooks/useDashboardStats';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Receipt, Users, TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const Index = () => {
  const navigate = useNavigate();
  const { loading, needsOnboarding } = useOrganization();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity();

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord</h1>
            <p className="text-muted-foreground">
              Vue d'ensemble de votre activité
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/devis')}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau devis
            </Button>
            <Button onClick={() => navigate('/factures')}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle facture
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Chiffre d'affaires (mois)</CardDescription>
              {stats?.revenueChange !== undefined && stats.revenueChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold tabular-nums">
                    {formatCurrency(stats?.monthlyRevenue || 0)}
                  </div>
                  <p className={`text-xs ${(stats?.revenueChange || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {(stats?.revenueChange || 0) >= 0 ? '+' : ''}{stats?.revenueChange || 0}% par rapport au mois dernier
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Factures en attente</CardDescription>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold tabular-nums">
                    {stats?.pendingInvoicesCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats?.pendingInvoicesAmount || 0)} en attente de paiement
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Devis en cours</CardDescription>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold tabular-nums">
                    {stats?.openQuotesCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats?.openQuotesAmount || 0)} de propositions
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Clients actifs</CardDescription>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <div className="text-2xl font-bold tabular-nums">
                    {stats?.activeClientsCount || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clients avec activité récente
                  </p>
                </>
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
