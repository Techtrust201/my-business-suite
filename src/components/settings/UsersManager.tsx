import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Users, Crown, Eye, Trash2, UserPlus, AlertCircle } from 'lucide-react';
import { useOrganizationUsers, useUserCount, useUpdateUserRole, useRemoveUser, type OrganizationUser } from '@/hooks/useOrganizationUsers';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function UsersManager() {
  const { data: users, isLoading } = useOrganizationUsers();
  const { count, max, canAddMore } = useUserCount();
  const updateRole = useUpdateUserRole();
  const removeUser = useRemoveUser();
  const { user: currentUser } = useAuth();

  const [userToRemove, setUserToRemove] = useState<OrganizationUser | null>(null);

  const getInitials = (user: OrganizationUser) => {
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || user.email[0].toUpperCase();
  };

  const handleRoleChange = (userId: string, role: 'admin' | 'readonly') => {
    updateRole.mutate({ userId, role });
  };

  const handleRemoveUser = () => {
    if (userToRemove) {
      removeUser.mutate(userToRemove.id);
      setUserToRemove(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs
            </CardTitle>
            <CardDescription>
              Gérez les membres de votre organisation
            </CardDescription>
          </div>
          <Button disabled={!canAddMore} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Inviter
          </Button>
        </div>

        {/* User limit indicator */}
        <div className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Utilisateurs</span>
            <span className="font-medium">{count} / {max}</span>
          </div>
          <Progress value={(count / max) * 100} className="h-2" />
          {!canAddMore && (
            <p className="text-xs text-muted-foreground">
              Limite atteinte. Contactez le support pour augmenter votre quota.
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {users && users.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucun utilisateur trouvé.
            </AlertDescription>
          </Alert>
        ) : (
          users?.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>{getInitials(user)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.email}
                  </p>
                  {user.id === currentUser?.id && (
                    <Badge variant="secondary" className="text-xs">Vous</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Ajouté le {format(new Date(user.created_at), 'd MMMM yyyy', { locale: fr })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={user.role}
                  onValueChange={(value) => handleRoleChange(user.id, value as 'admin' | 'readonly')}
                  disabled={user.id === currentUser?.id}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="readonly">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        Lecture
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setUserToRemove(user)}
                  disabled={user.id === currentUser?.id}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}

        {/* Permissions legend */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Permissions par rôle</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <span className="font-medium">Admin</span>
              </div>
              <ul className="text-muted-foreground space-y-1 ml-6">
                <li>• Accès complet à toutes les fonctionnalités</li>
                <li>• Gestion des utilisateurs</li>
                <li>• Voir les marges et prix d'achat</li>
                <li>• Paramètres de l'organisation</li>
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Lecture seule</span>
              </div>
              <ul className="text-muted-foreground space-y-1 ml-6">
                <li>• Consultation des données</li>
                <li>• Gestion des prospects</li>
                <li>• Création de devis/factures limitée</li>
                <li>• Pas d'accès aux marges</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Remove user confirmation */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToRemove && (
                <>
                  <strong>{userToRemove.first_name} {userToRemove.last_name}</strong> ({userToRemove.email}) 
                  sera retiré de l'organisation et n'aura plus accès aux données.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUser} className="bg-destructive text-destructive-foreground">
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
