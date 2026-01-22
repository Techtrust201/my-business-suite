import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import emailjs from '@emailjs/browser';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateInvitation } from '@/hooks/useInvitations';
import { useUserCount } from '@/hooks/useOrganizationUsers';
import { useOrganization } from '@/hooks/useOrganization';
import { Loader2, Copy, Check, Mail, Link2, Send } from 'lucide-react';
import { toast } from 'sonner';

// Configuration EmailJS
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const isEmailJSConfigured = EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;

const inviteSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  role: z.enum(['admin', 'readonly']),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { canAddMore, count, max } = useUserCount();
  const { organization } = useOrganization();
  const createInvitation = useCreateInvitation();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'readonly',
    },
  });

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

  const handleSubmit = async (values: InviteFormValues) => {
    try {
      setIsSendingEmail(true);
      const invitation = await createInvitation.mutateAsync({
        email: values.email,
        role: values.role,
      });
      const link = `${window.location.origin}/join?token=${invitation.token}`;
      setInvitationLink(link);
      
      // Envoyer l'email automatiquement
      const sent = await sendInvitationEmail(values.email, link, values.role);
      setEmailSent(sent);
      if (sent) {
        toast.success(`Invitation envoyée par email à ${values.email}`);
      }
      
      form.reset();
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCopyLink = async () => {
    if (invitationLink) {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success('Lien copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setInvitationLink(null);
    setEmailSent(false);
    form.reset();
    onOpenChange(false);
  };

  if (!canAddMore) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Limite atteinte</DialogTitle>
            <DialogDescription>
              Vous avez atteint la limite de {max} utilisateurs pour votre organisation.
              Pour ajouter plus d'utilisateurs, veuillez mettre à niveau votre abonnement.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>
            Invitez un nouveau membre à rejoindre votre organisation.
            Il reste {max - count} place(s) disponible(s).
          </DialogDescription>
        </DialogHeader>

        {invitationLink ? (
          <div className="space-y-4">
            {emailSent && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
                <Send className="h-5 w-5 shrink-0" />
                <p className="text-sm">Email d'invitation envoyé avec succès !</p>
              </div>
            )}
            
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Link2 className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm break-all flex-1">{invitationLink}</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copier le lien
                  </>
                )}
              </Button>
              <Button onClick={handleClose}>
                Terminé
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {emailSent ? "L'invité a reçu un email avec ce lien." : "Ce lien expire dans 7 jours."}
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="utilisateur@exemple.com"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="readonly">
                          <div className="flex flex-col items-start">
                            <span>Lecture seule</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex flex-col items-start">
                            <span>Administrateur</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === 'admin' 
                        ? 'Accès complet : marges, factures, utilisateurs'
                        : 'Accès en lecture : consultation sans modification'
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createInvitation.isPending || isSendingEmail}
                  className="flex-1"
                >
                  {createInvitation.isPending || isSendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSendingEmail ? 'Envoi...' : 'Création...'}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer l'invitation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
