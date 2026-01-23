import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Copy,
  MapPin,
  FileText,
  Calculator,
  Settings,
  LayoutDashboard,
  Users,
  Lock,
  Crown,
  Eye,
  Briefcase,
  CreditCard,
} from 'lucide-react';
import {
  useCustomRoles,
  useCreateCustomRole,
  useUpdateCustomRole,
  useDeleteCustomRole,
  useInitDefaultRoles,
  type CustomRole,
  type RolePermissions,
} from '@/hooks/useCustomRoles';
import { useCurrentUserPermissions } from '@/hooks/useCurrentUserPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Configuration des permissions par catégorie
const permissionCategories = {
  crm: {
    label: 'CRM / Prospection',
    icon: MapPin,
    permissions: [
      { key: 'view_prospects', label: 'Voir les prospects', description: 'Accès en lecture aux prospects' },
      { key: 'create_prospects', label: 'Créer des prospects', description: 'Ajouter de nouveaux prospects' },
      { key: 'edit_prospects', label: 'Modifier les prospects', description: 'Éditer les informations des prospects' },
      { key: 'delete_prospects', label: 'Supprimer les prospects', description: 'Supprimer des prospects existants' },
      { key: 'view_all_prospects', label: 'Voir tous les prospects', description: 'Voir les prospects de tous les commerciaux' },
      { key: 'send_emails', label: 'Envoyer des emails', description: 'Envoyer des emails depuis le CRM' },
      { key: 'assign_prospects', label: 'Attribuer des prospects', description: 'Assigner des prospects aux commerciaux' },
    ],
  },
  sales: {
    label: 'Devis & Factures',
    icon: FileText,
    permissions: [
      { key: 'view_quotes', label: 'Voir les devis', description: 'Consulter les devis existants' },
      { key: 'create_quotes', label: 'Créer des devis', description: 'Générer de nouveaux devis' },
      { key: 'edit_quotes', label: 'Modifier les devis', description: 'Éditer les devis existants' },
      { key: 'view_invoices', label: 'Voir les factures', description: 'Consulter les factures' },
      { key: 'create_invoices', label: 'Créer des factures', description: 'Générer de nouvelles factures' },
      { key: 'edit_invoices', label: 'Modifier les factures', description: 'Éditer les factures existantes' },
      { key: 'view_margins', label: 'Voir les marges', description: 'Accès aux prix d\'achat et marges' },
    ],
  },
  finance: {
    label: 'Finance & Comptabilité',
    icon: Calculator,
    permissions: [
      { key: 'view_accounting', label: 'Voir la comptabilité', description: 'Accès au module comptable' },
      { key: 'view_expenses', label: 'Voir les dépenses', description: 'Consulter les dépenses' },
      { key: 'create_expenses', label: 'Créer des dépenses', description: 'Ajouter de nouvelles dépenses' },
      { key: 'view_bank', label: 'Voir les comptes bancaires', description: 'Accès aux informations bancaires' },
      { key: 'view_reports', label: 'Voir les rapports', description: 'Accès aux rapports financiers' },
    ],
  },
  admin: {
    label: 'Administration',
    icon: Settings,
    permissions: [
      { key: 'manage_users', label: 'Gérer les utilisateurs', description: 'Inviter et gérer les membres' },
      { key: 'manage_settings', label: 'Paramètres organisation', description: 'Modifier les paramètres globaux' },
      { key: 'manage_commissions', label: 'Gérer les commissions', description: 'Configurer les règles de commissions' },
      { key: 'manage_roles', label: 'Gérer les rôles', description: 'Créer et modifier les rôles personnalisés' },
    ],
  },
};

const dashboardOptions = [
  { value: 'full', label: 'Complet', description: 'Accès à tous les widgets du dashboard', icon: LayoutDashboard },
  { value: 'commercial', label: 'Commercial', description: 'Dashboard orienté ventes et CRM', icon: Briefcase },
  { value: 'finance', label: 'Comptable', description: 'Dashboard orienté finance', icon: CreditCard },
  { value: 'readonly', label: 'Lecture seule', description: 'Dashboard minimal en consultation', icon: Eye },
];

const defaultPermissions: RolePermissions = {
  crm: {},
  sales: {},
  finance: {},
  admin: {},
  dashboard_type: 'readonly',
};

interface RoleFormData {
  name: string;
  description: string;
  permissions: RolePermissions;
}

// Helper function to safely parse permissions from Json
function parsePermissions(permissions: unknown): RolePermissions {
  if (!permissions || typeof permissions !== 'object') {
    return { ...defaultPermissions };
  }
  
  const parsed = permissions as Record<string, unknown>;
  return {
    crm: (parsed.crm as Record<string, boolean>) || {},
    sales: (parsed.sales as Record<string, boolean>) || {},
    finance: (parsed.finance as Record<string, boolean>) || {},
    admin: (parsed.admin as Record<string, boolean>) || {},
    dashboard_type: (parsed.dashboard_type as 'full' | 'commercial' | 'finance' | 'readonly') || 'readonly',
  };
}

export function RolesManager() {
  const { data: roles, isLoading, refetch } = useCustomRoles();
  const createRole = useCreateCustomRole();
  const updateRole = useUpdateCustomRole();
  const deleteRole = useDeleteCustomRole();
  const initDefaultRoles = useInitDefaultRoles();
  const { canManageRoles } = useCurrentUserPermissions();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: { ...defaultPermissions },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: { ...defaultPermissions },
    });
    setEditingRole(null);
  };

  const handleOpenDialog = (role?: CustomRole) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: parsePermissions(role.permissions),
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDuplicateRole = (role: CustomRole) => {
    setFormData({
      name: `${role.name} (copie)`,
      description: role.description || '',
      permissions: parsePermissions(role.permissions),
    });
    setEditingRole(null);
    setIsDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (editingRole) {
      updateRole.mutate(
        {
          id: editingRole.id,
          name: formData.name,
          description: formData.description || null,
          permissions: formData.permissions,
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createRole.mutate(
        {
          name: formData.name,
          description: formData.description || null,
          is_template: false,
          is_system: false,
          permissions: formData.permissions,
          dashboard_config: null,
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    }
  };

  const handleDeleteRole = () => {
    if (roleToDelete) {
      deleteRole.mutate(roleToDelete.id, {
        onSuccess: () => {
          setRoleToDelete(null);
        },
      });
    }
  };

  const handlePermissionChange = (
    category: keyof RolePermissions,
    permissionKey: string,
    checked: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...(prev.permissions[category] as Record<string, boolean>),
          [permissionKey]: checked,
        },
      },
    }));
  };

  const handleDashboardTypeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        dashboard_type: value as 'full' | 'commercial' | 'finance' | 'readonly',
      },
    }));
  };

  const getRoleIcon = (role: CustomRole) => {
    if (role.is_system) return <Shield className="h-4 w-4 text-destructive" />;
    if (role.is_template) return <Crown className="h-4 w-4 text-amber-500" />;
    return <Users className="h-4 w-4 text-primary" />;
  };

  const getRoleBadge = (role: CustomRole) => {
    if (role.is_system) return <Badge variant="destructive">Système</Badge>;
    if (role.is_template) return <Badge variant="secondary">Template</Badge>;
    return <Badge variant="outline">Personnalisé</Badge>;
  };

  const countPermissions = (role: CustomRole) => {
    let count = 0;
    const permissions = parsePermissions(role.permissions);
    
    Object.entries(permissionCategories).forEach(([key]) => {
      const categoryPerms = permissions[key as keyof RolePermissions];
      if (categoryPerms && typeof categoryPerms === 'object') {
        count += Object.values(categoryPerms).filter(Boolean).length;
      }
    });
    
    return count;
  };

  if (!canManageRoles) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
            <Lock className="h-12 w-12" />
            <div>
              <p className="font-medium">Accès restreint</p>
              <p className="text-sm">Seuls les administrateurs peuvent gérer les rôles.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const templateRoles = roles?.filter((r) => r.is_template || r.is_system) || [];
  const customRoles = roles?.filter((r) => !r.is_template && !r.is_system) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gestion des rôles
              </CardTitle>
              <CardDescription>
                Configurez les permissions d'accès pour chaque rôle de votre organisation
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {templateRoles.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => initDefaultRoles.mutate()}
                  disabled={initDefaultRoles.isPending}
                >
                  Créer rôles par défaut
                </Button>
              )}
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau rôle
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Rôles templates/système */}
          {templateRoles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Rôles prédéfinis
              </h3>
              <div className="grid gap-3">
                {templateRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      {getRoleIcon(role)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{role.name}</p>
                        {getRoleBadge(role)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {role.description || `${countPermissions(role)} permissions`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicateRole(role)}
                        title="Dupliquer ce rôle"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(role)}
                        title="Voir les permissions"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rôles personnalisés */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Rôles personnalisés
            </h3>
            {customRoles.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Aucun rôle personnalisé. Cliquez sur "Nouveau rôle" pour créer votre premier rôle.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-3">
                {customRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {getRoleIcon(role)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{role.name}</p>
                        {getRoleBadge(role)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {role.description || `${countPermissions(role)} permissions`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicateRole(role)}
                        title="Dupliquer"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(role)}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRoleToDelete(role)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog création/édition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole
                ? editingRole.is_template || editingRole.is_system
                  ? `Permissions du rôle "${editingRole.name}"`
                  : `Modifier le rôle "${editingRole.name}"`
                : 'Créer un nouveau rôle'}
            </DialogTitle>
            <DialogDescription>
              Configurez les permissions d'accès pour ce rôle
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Infos de base */}
            {!(editingRole?.is_template || editingRole?.is_system) && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom du rôle</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Commercial senior"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du rôle..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Type de dashboard */}
            <div className="space-y-3">
              <Label>Type de dashboard</Label>
              <Select
                value={formData.permissions.dashboard_type || 'readonly'}
                onValueChange={handleDashboardTypeChange}
                disabled={editingRole?.is_template || editingRole?.is_system}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dashboardOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Permissions par catégorie */}
            <Accordion type="multiple" defaultValue={['crm', 'sales']} className="w-full">
              {Object.entries(permissionCategories).map(([categoryKey, category]) => (
                <AccordionItem key={categoryKey} value={categoryKey}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      <span>{category.label}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {category.permissions.map((perm) => {
                        const categoryPerms = formData.permissions[categoryKey as keyof RolePermissions];
                        const isChecked = typeof categoryPerms === 'object' && categoryPerms !== null
                          ? (categoryPerms as Record<string, boolean>)[perm.key] || false
                          : false;
                        
                        return (
                          <div
                            key={perm.key}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div className="space-y-0.5">
                              <Label className="text-sm font-medium">{perm.label}</Label>
                              <p className="text-xs text-muted-foreground">{perm.description}</p>
                            </div>
                            <Switch
                              checked={isChecked}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(categoryKey as keyof RolePermissions, perm.key, checked)
                              }
                              disabled={editingRole?.is_template || editingRole?.is_system}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {editingRole?.is_template || editingRole?.is_system ? 'Fermer' : 'Annuler'}
            </Button>
            {!(editingRole?.is_template || editingRole?.is_system) && (
              <Button
                onClick={handleSaveRole}
                disabled={!formData.name || createRole.isPending || updateRole.isPending}
              >
                {editingRole ? 'Enregistrer' : 'Créer le rôle'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce rôle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les utilisateurs ayant ce rôle perdront leurs permissions personnalisées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
