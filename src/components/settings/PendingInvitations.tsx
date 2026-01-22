import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Clock, Copy, Mail, MailCheck, RefreshCw, Trash2, Check, Crown, Eye } from 'lucide-react';
import { useInvitations, useDeleteInvitation, useResendInvitation, type Invitation } from '@/hooks/useInvitations';
import { useOrganization } from '@/hooks/useOrganization';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';

// Configuration EmailJS
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const isEmailJSConfigured = EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;

export function PendingInvitations() {
  const { data: invitations, isLoading } = useInvitations();
  const deleteInvitation = useDeleteInvitation();
  const resendInvitation = useResendInvitation();
  const { organization } = useOrganization();

  const [invitationToDelete, setInvitationToDelete] = useState<Invitation | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sendInvitationEmail = async (email: string, link: string, role: string) => {
    if (!isEmailJSConfigured || !organization) return false;
    
    try {
      const roleLabel = role === 'admin' ? 'Administrateur' : 'Lecture seule';
      const templateParams = {
        to_email: email,
        subject: `Invitation à rejoindre ${organization.name}`,
        message: `Bonjour,

Vous êtes invité(e) à rejoindre l'organisation "${organization.name}" en tant que ${roleLabel}.

Cliquez sur le lien ci-dessous pour accepter l'invitation et créer votre compte :

${link}

Cette invitation expire dans 7 jours.

Cordialement,
${organization.name}`,
        organization_name: organization.name,
        document_type: 'Invitation',
        document_number: '',
        pdf_url: link,
        pdf_preview_url: '',
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID!,
        EMAILJS_TEMPLATE_ID!,
        templateParams,
        { publicKey: EMAILJS_PUBLIC_KEY }
      );
      return true;
    } catch (error) {
      console.error('Erreur envoi email invitation:', error);
      return false;
    }
  };

  const handleResend = async (invitation: Invitation) => {
    setResendingId(invitation.id);
    try {
      const updatedInvitation = await resendInvitation.mutateAsync(invitation.id);
      const link = `${window.location.origin}/join?token=${updatedInvitation.token}`;
      
      const emailSent = await sendInvitationEmail(invitation.email, link, invitation.role);
      
      if (emailSent) {
        toast.success(`Invitation renvoyée par email à ${invitation.email}`);
      } else {
        toast.success('Invitation renouvelée. Copiez le lien pour le partager manuellement.');
      }
    } catch (error) {
      // Error handled by mutation
    } finally {
      setResendingId(null);
    }
  };

  const handleCopyLink = async (invitation: Invitation) => {
    const link = `${window.location.origin}/join?token=${invitation.token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(invitation.id);
    toast.success('Lien copié dans le presse-papiers');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = () => {
    if (invitationToDelete) {
      deleteInvitation.mutate(invitationToDelete.id);
      setInvitationToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Invitations en attente ({invitations.length})
        </CardTitle>
        <CardDescription>
          Gérez les invitations non encore acceptées
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {invitations.map((invitation) => {
          const expiresIn = formatDistanceToNow(new Date(invitation.expires_at), {
            addSuffix: true,
            locale: fr,
          });
          const isResending = resendingId === invitation.id;
          const isCopied = copiedId === invitation.id;

          return (
            <div
              key={invitation.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{invitation.email}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {invitation.role === 'admin' ? (
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3 text-amber-500" />
                          Admin
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Lecture
                        </span>
                      )}
                    </Badge>
                    <span>•</span>
                    <span>Expire {expiresIn}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResend(invitation)}
                  disabled={isResending}
                  className="gap-1.5"
                >
                  {isResending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MailCheck className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Renvoyer</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyLink(invitation)}
                  className="gap-1.5"
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{isCopied ? 'Copié' : 'Copier'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setInvitationToDelete(invitation)}
                  className="text-destructive hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <AlertDialog open={!!invitationToDelete} onOpenChange={() => setInvitationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette invitation ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'invitation pour <strong>{invitationToDelete?.email}</strong> sera annulée.
              L'utilisateur ne pourra plus rejoindre l'organisation avec ce lien.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
