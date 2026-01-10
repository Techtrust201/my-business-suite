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
import { Send, Download, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';
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

// Configuration EmailJS depuis les variables d'environnement
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Vérifie si EmailJS est configuré
const isEmailJSConfigured = EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;

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
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingEmailJS, setIsSendingEmailJS] = useState(false);

  const documentLabel = documentType === 'invoice' ? 'facture' : 'devis';
  const documentLabelCap = documentType === 'invoice' ? 'Facture' : 'Devis';

  const defaultSubject = `${documentLabelCap} ${documentNumber}${organizationName ? ` - ${organizationName}` : ''}`;
  const defaultMessage = documentType === 'invoice'
    ? `Bonjour,\n\nVeuillez trouver ci-joint la facture ${documentNumber}.\n\nNous vous remercions pour votre confiance.\n\nCordialement${organizationName ? `,\n${organizationName}` : ''}`
    : `Bonjour,\n\nVeuillez trouver ci-joint le devis ${documentNumber}.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement${organizationName ? `,\n${organizationName}` : ''}`;

  // Envoi automatique via EmailJS
  const handleSendEmailJS = async () => {
    if (!email) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }

    if (!isEmailJSConfigured) {
      toast.error('EmailJS n\'est pas configuré. Utilisez l\'envoi manuel.');
      return;
    }

    setIsSendingEmailJS(true);

    try {
      // 1. Générer le PDF et le convertir en base64
      const pdfDoc = await pdfGenerator();
      const pdfBase64 = pdfDoc.output('datauristring');
      
      // 2. Aussi télécharger le PDF localement (backup)
      pdfDoc.save(`${documentLabelCap}-${documentNumber}.pdf`);

      // 3. Envoyer via EmailJS
      const templateParams = {
        to_email: email,
        subject: subject || defaultSubject,
        message: message || defaultMessage,
        document_type: documentLabelCap,
        document_number: documentNumber,
        organization_name: organizationName,
        pdf_attachment: pdfBase64,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID!,
        EMAILJS_TEMPLATE_ID!,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      toast.success(`${documentLabelCap} envoyée par email avec succès !`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erreur EmailJS:', error);
      toast.error('Erreur lors de l\'envoi. Essayez l\'envoi manuel.');
    } finally {
      setIsSendingEmailJS(false);
    }
  };

  // Envoi manuel via Zoho (fallback)
  const handleSendManual = async () => {
    if (!email) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Générer et télécharger le PDF
      const pdfDoc = await pdfGenerator();
      pdfDoc.save(`${documentLabelCap}-${documentNumber}.pdf`);

      // 2. Ouvrir Zoho Mail compose dans un nouvel onglet
      window.open('https://mail.zoho.eu/zm/#compose', '_blank');

      // 3. Afficher les infos à copier
      toast.success(
        `PDF téléchargé ! Dans Zoho Mail :\n• Destinataire : ${email}\n• Joignez le PDF téléchargé`,
        { duration: 8000 }
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer la {documentLabel} par email</DialogTitle>
          <DialogDescription>
            {isEmailJSConfigured 
              ? 'Envoyez automatiquement ou manuellement via Zoho Mail.'
              : 'Le PDF sera téléchargé et Zoho Mail s\'ouvrira pour l\'envoi.'}
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

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          
          {/* Bouton envoi manuel (toujours disponible) */}
          <Button 
            variant="secondary"
            onClick={handleSendManual} 
            disabled={!email || isProcessing || isSendingEmailJS}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Envoyer via Zoho
          </Button>

          {/* Bouton envoi automatique (si EmailJS configuré) */}
          {isEmailJSConfigured && (
            <Button 
              onClick={handleSendEmailJS} 
              disabled={!email || isProcessing || isSendingEmailJS}
            >
              {isSendingEmailJS ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Envoyer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
