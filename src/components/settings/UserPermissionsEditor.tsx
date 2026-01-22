import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Mail, LayoutDashboard } from 'lucide-react';
import { useUpdateUserPermissions, type OrganizationUser } from '@/hooks/useOrganizationUsers';

interface UserPermissionsEditorProps {
  user: OrganizationUser;
  isCurrentUser: boolean;
}

const permissionConfig = [
  {
    key: 'can_manage_prospects' as const,
    label: 'Gestion prospects',
    description: 'Créer, modifier et supprimer des prospects',
    icon: MapPin,
  },
  {
    key: 'can_send_emails' as const,
    label: 'Envoi d\'emails',
    description: 'Envoyer des emails depuis le CRM',
    icon: Mail,
  },
  {
    key: 'can_view_dashboard' as const,
    label: 'Accès dashboard',
    description: 'Voir le tableau de bord et les statistiques',
    icon: LayoutDashboard,
  },
];

export function UserPermissionsEditor({ user, isCurrentUser }: UserPermissionsEditorProps) {
  const updatePermissions = useUpdateUserPermissions();
  
  // Admins have all permissions, no need to show toggles
  if (user.role === 'admin') {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Permissions CRM</CardTitle>
          <CardDescription className="text-xs">
            Les administrateurs ont accès à toutes les fonctionnalités.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleToggle = (permissionKey: 'can_manage_prospects' | 'can_send_emails' | 'can_view_dashboard', checked: boolean) => {
    updatePermissions.mutate({
      userId: user.id,
      permissions: { [permissionKey]: checked },
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Permissions CRM</CardTitle>
        <CardDescription className="text-xs">
          Configurez les accès pour cet utilisateur en lecture seule.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {permissionConfig.map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor={`${user.id}-${key}`} className="text-sm font-medium cursor-pointer">
                  {label}
                </Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              id={`${user.id}-${key}`}
              checked={user.permissions[key]}
              onCheckedChange={(checked) => handleToggle(key, checked)}
              disabled={isCurrentUser || updatePermissions.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
