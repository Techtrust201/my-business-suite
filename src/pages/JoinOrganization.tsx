import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInvitationByToken, useAcceptInvitation } from '@/hooks/useInvitations';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, XCircle, Building2, UserPlus } from 'lucide-react';

const JoinOrganization = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();
  
  const { data: invitation, isLoading: invitationLoading, error } = useInvitationByToken(token);
  const acceptInvitation = useAcceptInvitation();
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    if (!token) return;
    
    try {
      await acceptInvitation.mutateAsync(token);
      setAccepted(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user && token) {
      // Store token for after login
      sessionStorage.setItem('pendingInvitationToken', token);
      navigate('/auth');
    }
  }, [authLoading, user, token, navigate]);

  // Check for pending invitation after login
  useEffect(() => {
    const pendingToken = sessionStorage.getItem('pendingInvitationToken');
    if (user && pendingToken && !token) {
      sessionStorage.removeItem('pendingInvitationToken');
      navigate(`/join?token=${pendingToken}`);
    }
  }, [user, token, navigate]);

  if (authLoading || invitationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Chargement de l'invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invitation invalide</CardTitle>
            <CardDescription>
              Cette invitation n'existe pas, a expiré ou a déjà été utilisée.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/auth')}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Bienvenue !</CardTitle>
            <CardDescription>
              Vous avez rejoint l'organisation avec succès. Redirection en cours...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const roleLabel = invitation.role === 'admin' ? 'Administrateur' : 'Lecture seule';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Rejoindre {invitation.organizations?.name}</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre cette organisation avec le rôle "{roleLabel}".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{invitation.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rôle</span>
              <span className="font-medium">{roleLabel}</span>
            </div>
          </div>

          {user?.email?.toLowerCase() !== invitation.email.toLowerCase() && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              ⚠️ Vous êtes connecté avec {user?.email}. Cette invitation est destinée à {invitation.email}.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAccept}
              disabled={acceptInvitation.isPending}
              className="flex-1"
            >
              {acceptInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Rejoindre
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinOrganization;
