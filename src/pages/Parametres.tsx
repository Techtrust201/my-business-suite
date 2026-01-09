import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/hooks/useOrganization';
import { Building2, User, CreditCard, Bell } from 'lucide-react';

const Parametres = () => {
  const { organization, profile } = useOrganization();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">
            Configurez votre organisation
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organisation
              </CardTitle>
              <CardDescription>
                Informations de votre entreprise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Nom</span>
                <p className="font-medium">{organization?.name || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">SIRET</span>
                <p className="font-medium">{organization?.siret || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Email</span>
                <p className="font-medium">{organization?.email || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Mon profil
              </CardTitle>
              <CardDescription>
                Vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Nom</span>
                <p className="font-medium">
                  {profile?.first_name} {profile?.last_name}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Email</span>
                <p className="font-medium">{profile?.email || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Téléphone</span>
                <p className="font-medium">{profile?.phone || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Facturation
              </CardTitle>
              <CardDescription>
                Paramètres de facturation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Devise</span>
                <p className="font-medium">{organization?.currency || 'EUR'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Préfixe factures</span>
                <p className="font-medium">{organization?.invoice_prefix || 'FAC-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Délai de paiement</span>
                <p className="font-medium">{organization?.default_payment_terms || 30} jours</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Préférences de notification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configuration des notifications à venir...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Parametres;
