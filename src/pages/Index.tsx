import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, LogOut, Building2 } from 'lucide-react';

const Index = () => {
  const { user, signOut } = useAuth();
  const { organization, profile, loading, needsOnboarding } = useOrganization();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-xl bg-primary p-3 w-fit">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Configuration de votre organisation</CardTitle>
            <CardDescription>
              Bienvenue {profile?.first_name} ! Pour commencer, configurez votre entreprise.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              L'assistant de configuration arrive bientôt. En attendant, votre compte est prêt !
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold">Factura</h1>
              <p className="text-sm text-muted-foreground">{organization?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold mb-2">Tableau de bord</h2>
          <p className="text-muted-foreground mb-8">
            Vue d'ensemble de votre activité
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Chiffre d'affaires (mois)</CardDescription>
                <CardTitle className="text-3xl tabular-nums">0 €</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Factures en attente</CardDescription>
                <CardTitle className="text-3xl tabular-nums">0</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Devis en cours</CardDescription>
                <CardTitle className="text-3xl tabular-nums">0</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Clients actifs</CardDescription>
                <CardTitle className="text-3xl tabular-nums">0</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="mt-8 text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              🚧 Les modules Clients, Devis, Factures arrivent bientôt...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;