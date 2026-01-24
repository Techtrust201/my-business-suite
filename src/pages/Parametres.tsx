import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationForm } from '@/components/settings/OrganizationForm';

import { BankAccountsManager } from '@/components/settings/BankAccountsManager';
import { BillingSettingsForm } from '@/components/settings/BillingSettingsForm';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { TaxRatesManager } from '@/components/settings/TaxRatesManager';
import { LogoUpload } from '@/components/settings/LogoUpload';
import { ProspectStatusesManager } from '@/components/settings/ProspectStatusesManager';
import { UsersManager } from '@/components/settings/UsersManager';
import { RolesManager } from '@/components/settings/RolesManager';
import { AdminPasswordReset } from '@/components/settings/AdminPasswordReset';
import { AutoRemindersManager } from '@/components/settings/AutoRemindersManager';
import { CommissionsManager } from '@/components/settings/CommissionsManager';
import { Building2, User, CreditCard, Percent, MapPin, Users, Shield, KeyRound, Clock, TrendingUp } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Liste des super-admins autorisés à voir l'onglet Admin
const SUPER_ADMIN_EMAILS = ['hugoportier3@gmail.com', 'contact@tech-trust.fr'];

const Parametres = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const defaultTab = searchParams.get('tab') || 'organization';
  
  // Vérifier si l'utilisateur est un super-admin
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">
            Configurez votre organisation et vos préférences
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-8' : 'grid-cols-7'} lg:w-auto lg:inline-flex`}>
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Organisation</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">Rôles</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Facturation</span>
            </TabsTrigger>
            <TabsTrigger value="taxes" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">TVA</span>
            </TabsTrigger>
            <TabsTrigger value="crm" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">CRM</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2 text-destructive">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="organization" className="space-y-6">
            <LogoUpload />
            <OrganizationForm />
            <BankAccountsManager />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileForm />
          </TabsContent>

          <TabsContent value="users">
            <UsersManager />
          </TabsContent>

          <TabsContent value="roles">
            <RolesManager />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <BillingSettingsForm />
            <CommissionsManager />
          </TabsContent>

          <TabsContent value="taxes">
            <TaxRatesManager />
          </TabsContent>

          <TabsContent value="crm" className="space-y-6">
            <ProspectStatusesManager />
            <AutoRemindersManager />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="admin">
              <AdminPasswordReset />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Parametres;
