import { useState } from 'react';
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
import { Send, Loader2 } from 'lucide-react';
import { useSendEmail } from '@/hooks/useSendEmail';
import jsPDF from 'jspdf';

interface SendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentNumber: string;
  documentType: 'invoice' | 'quote';
  recipientEmail?: string;
  organizationName?: string;
  pdfGenerator: () => Promise<jsPDF>;
  onSuccess?: () => void;
}

export const SendEmailModal = ({
  open,
  onOpenChange,
  documentId,
  documentNumber,
  documentType,
  recipientEmail: initialEmail = '',
  organizationName = '',
  pdfGenerator,
  onSuccess,
}: SendEmailModalProps) => {
  const { sendEmail, isSending } = useSendEmail();
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const documentLabel = documentType === 'invoice' ? 'facture' : 'devis';
  const documentLabelCap = documentType === 'invoice' ? 'Facture' : 'Devis';

  const defaultSubject = `${documentLabelCap} ${documentNumber}${organizationName ? ` - ${organizationName}` : ''}`;
  const defaultMessage = documentType === 'invoice'
    ? `Bonjour,\n\nVeuillez trouver ci-joint la facture ${documentNumber}.\n\nNous vous remercions pour votre confiance.\n\nCordialement${organizationName ? `,\n${organizationName}` : ''}`
    : `Bonjour,\n\nVeuillez trouver ci-joint le devis ${documentNumber}.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement${organizationName ? `,\n${organizationName}` : ''}`;

  const handleSend = async () => {
    if (!email) {
      return;
    }

    try {
      // Generate PDF
      const pdfDoc = await pdfGenerator();
      const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];

      const success = await sendEmail({
        invoiceId: documentId,
        recipientEmail: email,
        pdfBase64,
        documentType,
        documentNumber,
        subject: subject || defaultSubject,
        message: message || defaultMessage,
      });

      if (success) {
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error generating PDF for email:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer la {documentLabel} par email</DialogTitle>
          <DialogDescription>
            Le PDF sera généré et envoyé en pièce jointe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email du destinataire *</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Objet (optionnel)</Label>
            <Input
              id="subject"
              placeholder={defaultSubject}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              placeholder={defaultMessage}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={!email || isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
