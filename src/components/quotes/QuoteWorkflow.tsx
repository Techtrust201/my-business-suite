import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileText,
  Send,
  Clock,
  Bell,
  CheckCircle2,
  ArrowRight,
  Mail,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useCreateReminder } from '@/hooks/useReminders';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

interface Quote {
  id: string;
  number: string;
  status: QuoteStatus;
  date: string;
  valid_until?: string;
  contact_id?: string;
  contact?: {
    id: string;
    company_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  sent_at?: string;
}

interface QuoteWorkflowProps {
  quote: Quote;
  onStatusChange?: (newStatus: QuoteStatus) => Promise<void>;
  onSendQuote?: () => void;
}

const statusConfig: Record<QuoteStatus, { label: string; color: string; step: number }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800', step: 1 },
  sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-800', step: 2 },
  viewed: { label: 'Consulté', color: 'bg-purple-100 text-purple-800', step: 2 },
  accepted: { label: 'Accepté', color: 'bg-green-100 text-green-800', step: 4 },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-800', step: 4 },
  expired: { label: 'Expiré', color: 'bg-yellow-100 text-yellow-800', step: 4 },
};

const FOLLOW_UP_DELAYS = [
  { value: '3', label: '3 jours' },
  { value: '5', label: '5 jours' },
  { value: '7', label: '7 jours (recommandé)' },
  { value: '10', label: '10 jours' },
  { value: '14', label: '2 semaines' },
  { value: 'custom', label: 'Personnalisé...' },
];

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  isCompleted: boolean;
  isCurrent: boolean;
}

function WorkflowStepper({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                step.isCompleted
                  ? 'border-green-500 bg-green-500 text-white'
                  : step.isCurrent
                    ? 'border-primary bg-primary text-white'
                    : 'border-muted bg-muted text-muted-foreground'
              )}
            >
              {step.isCompleted ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                step.icon
              )}
            </div>
            <div className="mt-2 text-center">
              <p className={cn(
                'text-xs font-medium',
                step.isCurrent && 'text-primary',
                step.isCompleted && 'text-green-600'
              )}>
                {step.title}
              </p>
              <p className="text-[10px] text-muted-foreground max-w-[80px]">
                {step.description}
              </p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 px-2">
              <div
                className={cn(
                  'h-0.5 w-full transition-colors',
                  step.isCompleted ? 'bg-green-500' : 'bg-muted'
                )}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function QuoteWorkflow({ quote, onStatusChange, onSendQuote }: QuoteWorkflowProps) {
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpDelay, setFollowUpDelay] = useState('7');
  const [customDelay, setCustomDelay] = useState('');
  const [reminderMessage, setReminderMessage] = useState(
    `Relancer le client concernant le devis ${quote.number}`
  );
  const [autoCreateReminder, setAutoCreateReminder] = useState(true);

  const { user } = useAuth();
  const createReminder = useCreateReminder();

  const currentStep = statusConfig[quote.status].step;

  const steps: Step[] = [
    {
      id: 1,
      title: 'Création',
      description: 'Devis créé',
      icon: <FileText className="h-4 w-4" />,
      isCompleted: currentStep > 1 || currentStep === 1,
      isCurrent: currentStep === 1,
    },
    {
      id: 2,
      title: 'Envoi',
      description: 'Envoyé au client',
      icon: <Send className="h-4 w-4" />,
      isCompleted: currentStep > 2 || ['sent', 'viewed'].includes(quote.status),
      isCurrent: ['sent', 'viewed'].includes(quote.status),
    },
    {
      id: 3,
      title: 'Relance',
      description: 'Suivi programmé',
      icon: <Bell className="h-4 w-4" />,
      isCompleted: false, // This would need a query to check if reminder exists
      isCurrent: ['sent', 'viewed'].includes(quote.status),
    },
    {
      id: 4,
      title: 'Réponse',
      description: 'Accepté/Refusé',
      icon: <CheckCircle2 className="h-4 w-4" />,
      isCompleted: ['accepted', 'rejected', 'expired'].includes(quote.status),
      isCurrent: ['accepted', 'rejected', 'expired'].includes(quote.status),
    },
  ];

  const handleSendQuote = async () => {
    if (onSendQuote) {
      onSendQuote();
    }
    // Automatically show follow-up dialog after sending
    setShowFollowUpDialog(true);
  };

  const handleCreateFollowUp = async () => {
    if (!user?.id) {
      toast.error('Utilisateur non connecté');
      return;
    }

    const delay = followUpDelay === 'custom' ? parseInt(customDelay) : parseInt(followUpDelay);
    if (isNaN(delay) || delay <= 0) {
      toast.error('Délai invalide');
      return;
    }

    const remindAt = addDays(new Date(), delay);

    try {
      await createReminder.mutateAsync({
        title: `Relance devis ${quote.number}`,
        description: reminderMessage,
        remind_at: remindAt.toISOString(),
        related_to_id: quote.id,
        related_to_type: 'quote',
      });
      setShowFollowUpDialog(false);
      toast.success(`Rappel programmé pour le ${format(remindAt, 'PPP', { locale: fr })}`);
    } catch (error) {
      console.error('Error creating reminder:', error);
    }
  };

  const contactName = quote.contact
    ? quote.contact.company_name || `${quote.contact.first_name} ${quote.contact.last_name}`
    : 'Client';

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Workflow du devis
              </CardTitle>
              <CardDescription>
                Suivi du cycle de vie du devis {quote.number}
              </CardDescription>
            </div>
            <Badge className={statusConfig[quote.status].color}>
              {statusConfig[quote.status].label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <WorkflowStepper steps={steps} />

          <Separator />

          {/* Actions based on current status */}
          <div className="space-y-3">
            {quote.status === 'draft' && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Send className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Prêt à envoyer</p>
                    <p className="text-xs text-muted-foreground">
                      Envoyez ce devis au client par email
                    </p>
                  </div>
                </div>
                <Button onClick={handleSendQuote}>
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            )}

            {['sent', 'viewed'].includes(quote.status) && (
              <>
                {quote.sent_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Send className="h-4 w-4" />
                    <span>
                      Envoyé le {format(new Date(quote.sent_at), 'PPP à HH:mm', { locale: fr })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Programmer une relance</p>
                      <p className="text-xs text-muted-foreground">
                        Créez un rappel pour relancer {contactName}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setShowFollowUpDialog(true)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Programmer
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="default"
                    onClick={() => onStatusChange?.('accepted')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marquer comme accepté
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => onStatusChange?.('rejected')}
                  >
                    Marquer comme refusé
                  </Button>
                </div>
              </>
            )}

            {quote.status === 'accepted' && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Devis accepté !</p>
                    <p className="text-xs text-green-600">
                      Vous pouvez maintenant créer une facture
                    </p>
                  </div>
                </div>
                <Button variant="default">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Créer la facture
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Programmer une relance</DialogTitle>
            <DialogDescription>
              Créez un rappel pour relancer le client concernant ce devis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Délai avant relance</Label>
              <Select value={followUpDelay} onValueChange={setFollowUpDelay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_DELAYS.map((delay) => (
                    <SelectItem key={delay.value} value={delay.value}>
                      {delay.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {followUpDelay === 'custom' && (
              <div className="space-y-2">
                <Label>Nombre de jours</Label>
                <Input
                  type="number"
                  min={1}
                  value={customDelay}
                  onChange={(e) => setCustomDelay(e.target.value)}
                  placeholder="Entrez le nombre de jours"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Message de rappel</Label>
              <Textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                placeholder="Message pour vous rappeler..."
                rows={3}
              />
            </div>

            {followUpDelay !== 'custom' && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Rappel prévu le{' '}
                  <strong>
                    {format(
                      addDays(new Date(), parseInt(followUpDelay)),
                      'EEEE d MMMM yyyy',
                      { locale: fr }
                    )}
                  </strong>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFollowUp} disabled={createReminder.isPending}>
              {createReminder.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Créer le rappel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
