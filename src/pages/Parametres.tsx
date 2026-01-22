import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganizationForm } from '@/components/settings/OrganizationForm';
import { BankingForm } from '@/components/settings/BankingForm';
import { BillingSettingsForm } from '@/components/settings/BillingSettingsForm';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { TaxRatesManager } from '@/components/settings/TaxRatesManager';
import { LogoUpload } from '@/components/settings/LogoUpload';
import { ProspectStatusesManager } from '@/components/settings/ProspectStatusesManager';
import { UsersManager } from '@/components/settings/UsersManager';
import { Building2, User, CreditCard, Percent, MapPin, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const Parametres = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'organization';
  
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
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
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
          </TabsList>

          <TabsContent value="organization" className="space-y-6">
            <LogoUpload />
            <OrganizationForm />
            <BankingForm />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileForm />
          </TabsContent>

          <TabsContent value="users">
            <UsersManager />
          </TabsContent>

          <TabsContent value="billing">
            <BillingSettingsForm />
          </TabsContent>

          <TabsContent value="taxes">
            <TaxRatesManager />
          </TabsContent>

          <TabsContent value="crm">
            <ProspectStatusesManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Parametres;
