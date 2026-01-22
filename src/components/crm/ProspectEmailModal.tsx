import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Loader2, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import type { ProspectWithStatus, ProspectContact } from '@/hooks/useProspects';

interface ProspectEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: ProspectWithStatus;
  contacts: ProspectContact[];
}

type TemplateType = 'introduction' | 'followup' | 'quote' | 'custom';

const TEMPLATES: Record<TemplateType, { subject: string; body: string }> = {
  introduction: {
    subject: 'Présentation de nos services - {company}',
    body: `Bonjour,

Je me permets de vous contacter suite à notre rencontre récente.

{organization} accompagne les entreprises comme la vôtre dans leurs besoins en [services].

Je serais ravi d'échanger avec vous pour mieux comprendre vos besoins et vous présenter nos solutions.

Seriez-vous disponible pour un échange téléphonique ou une rencontre ?

Bien cordialement,
{user_name}
{organization}`,
  },
  followup: {
    subject: 'Suivi - {company}',
    body: `Bonjour,

Je me permets de revenir vers vous suite à notre dernier échange.

Avez-vous eu le temps de réfléchir à notre proposition ?

Je reste à votre disposition pour toute question ou pour programmer un nouveau rendez-vous.

Bien cordialement,
{user_name}
{organization}`,
  },
  quote: {
    subject: 'Devis - {company}',
    body: `Bonjour,

Suite à notre discussion, je vous envoie ci-joint notre proposition commerciale.

N'hésitez pas à me contacter pour toute question ou ajustement.

Bien cordialement,
{user_name}
{organization}`,
  },
  custom: {
    subject: '',
    body: '',
  },
};

export function ProspectEmailModal({
  open,
  onOpenChange,
  prospect,
  contacts,
}: ProspectEmailModalProps) {
  const { organization } = useOrganization();
  const { user } = useAuth();

  const [selectedContact, setSelectedContact] = useState<string>('');
  const [email, setEmail] = useState('');
  const [template, setTemplate] = useState<TemplateType>('introduction');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Get primary contact or first contact
  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];

  // Initialize email when modal opens
  useEffect(() => {
    if (open) {
      const contactEmail = primaryContact?.email || prospect.email || '';
      setEmail(contactEmail);
      setSelectedContact(primaryContact?.id || '');
      applyTemplate('introduction');
    }
  }, [open, primaryContact, prospect.email]);

  const applyTemplate = (templateType: TemplateType) => {
    setTemplate(templateType);
    const t = TEMPLATES[templateType];
    
    const userName = user?.user_metadata?.first_name && user?.user_metadata?.last_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : user?.email?.split('@')[0] || '';

    const processedSubject = t.subject
      .replace('{company}', prospect.company_name)
      .replace('{organization}', organization?.name || '');

    const processedBody = t.body
      .replace(/{company}/g, prospect.company_name)
      .replace(/{organization}/g, organization?.name || '')
      .replace(/{user_name}/g, userName);

    setSubject(processedSubject);
    setBody(processedBody);
  };

  const handleContactChange = (contactId: string) => {
    setSelectedContact(contactId);
    const contact = contacts.find(c => c.id === contactId);
    if (contact?.email) {
      setEmail(contact.email);
    }
  };

  const saveEmailToHistory = async () => {
    if (!user || !organization) return;

    await supabase.from('prospect_emails').insert({
      prospect_id: prospect.id,
      organization_id: organization.id,
      prospect_contact_id: selectedContact || null,
      to_email: email,
      subject,
      body,
      sent_by: user.id,
      sent_at: new Date().toISOString(),
    });
  };

  const handleSendViaMailClient = async () => {
    if (!email) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }

    setIsSending(true);

    try {
      // Save to history
      await saveEmailToHistory();

      // Open default mail client
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;

      toast.success('Email enregistré dans l\'historique');
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`Objet: ${subject}\n\n${body}`);
      toast.success('Copié dans le presse-papier');
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Envoyer un email</DialogTitle>
          <DialogDescription>{prospect.company_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contact selection */}
          {contacts.length > 0 && (
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select value={selectedContact} onValueChange={handleContactChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.is_primary && ' (principal)'}
                      {contact.email && ` - ${contact.email}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email du destinataire *</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Template selection */}
          <div className="space-y-2">
            <Label>Modèle</Label>
            <Select value={template} onValueChange={(v) => applyTemplate(v as TemplateType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="introduction">Introduction</SelectItem>
                <SelectItem value="followup">Relance</SelectItem>
                <SelectItem value="quote">Envoi de devis</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Objet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet de l'email"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="secondary" onClick={handleCopyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            Copier
          </Button>
          <Button onClick={handleSendViaMailClient} disabled={!email || isSending}>
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Ouvrir client mail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
