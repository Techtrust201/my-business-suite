import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import emailjs from "@emailjs/browser";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { generatePdfPreview } from "@/lib/pdfPreviewGenerator";

interface SendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentNumber: string;
  documentType: "invoice" | "quote";
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
const isEmailJSConfigured =
  EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;

export const SendEmailModal = ({
  open,
  onOpenChange,
  documentId,
  documentNumber,
  documentType,
  recipientEmail: initialEmail = "",
  organizationName = "",
  pdfGenerator,
  onSuccess,
}: SendEmailModalProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingEmailJS, setIsSendingEmailJS] = useState(false);

  const { organization } = useOrganization();
  const { user } = useAuth();

  const documentLabel = documentType === "invoice" ? "facture" : "devis";
  const documentLabelCap = documentType === "invoice" ? "Facture" : "Devis";

  const defaultSubject = `${documentLabelCap} ${documentNumber}${
    organizationName ? ` - ${organizationName}` : ""
  }`;

  const defaultMessage =
    documentType === "invoice"
      ? `Bonjour,

Veuillez trouver ci-dessous votre facture ${documentNumber}.

Vous pouvez télécharger le PDF complet en cliquant sur le bouton ou l'image dans cet email.

Nous vous remercions pour votre confiance.

Cordialement${organizationName ? `,\n${organizationName}` : ""}`
      : `Bonjour,

Veuillez trouver ci-dessous votre devis ${documentNumber}.

Vous pouvez télécharger le PDF complet en cliquant sur le bouton ou l'image dans cet email.

N'hésitez pas à nous contacter pour toute question.

Cordialement${organizationName ? `,\n${organizationName}` : ""}`;

  const [message, setMessage] = useState(defaultMessage);

  // Envoi automatique via EmailJS avec upload sur Supabase Storage
  const handleSendEmailJS = async () => {
    if (!email) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    if (!isEmailJSConfigured) {
      toast.error("EmailJS n'est pas configuré. Utilisez l'envoi manuel.");
      return;
    }

    if (!user) {
      toast.error("Vous devez être connecté pour envoyer un email");
      return;
    }

    if (!organization) {
      toast.error("Organisation non trouvée");
      return;
    }

    setIsSendingEmailJS(true);

    try {
      // 1. Générer le PDF
      const pdfDoc = await pdfGenerator();

      // 2. Générer un UUID unique pour ce document
      const uuid = crypto.randomUUID();
      const basePath = `${organization.id}/${documentId}`;
      const pdfFileName = `${uuid}-${documentType}-${documentNumber}.pdf`;
      const previewFileName = `${uuid}-preview-${documentType}-${documentNumber}.png`;

      // 3. Upload du PDF sur Supabase Storage
      const pdfBlob = pdfDoc.output("blob");
      const { error: pdfUploadError } = await supabase.storage
        .from("documents")
        .upload(`${basePath}/${pdfFileName}`, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (pdfUploadError) {
        console.error("PDF upload error:", pdfUploadError);
        throw new Error(`Erreur upload PDF: ${pdfUploadError.message}`);
      }

      // 4. Générer et uploader la preview PNG
      let previewUrl = "";
      try {
        const previewBlob = await generatePdfPreview(
          pdfDoc,
          documentLabelCap,
          documentNumber,
          organizationName
        );

        const { error: previewUploadError } = await supabase.storage
          .from("documents")
          .upload(`${basePath}/${previewFileName}`, previewBlob, {
            contentType: "image/png",
            upsert: false,
          });

        if (!previewUploadError) {
          const { data: previewData } = supabase.storage
            .from("documents")
            .getPublicUrl(`${basePath}/${previewFileName}`);
          previewUrl = previewData.publicUrl;
        } else {
          console.warn("Preview upload failed:", previewUploadError);
        }
      } catch (previewError) {
        console.warn(
          "Preview generation failed, continuing without preview:",
          previewError
        );
      }

      // 5. Obtenir l'URL publique du PDF
      const { data: pdfData } = supabase.storage
        .from("documents")
        .getPublicUrl(`${basePath}/${pdfFileName}`);
      const pdfUrl = pdfData.publicUrl;

      // 6. Envoyer l'email via EmailJS avec les URLs
      const templateParams = {
        to_email: email,
        subject: subject || defaultSubject,
        message: message || defaultMessage,
        document_type: documentLabelCap,
        document_number: documentNumber,
        organization_name: organizationName,
        pdf_url: pdfUrl,
        pdf_preview_url: previewUrl,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID!,
        EMAILJS_TEMPLATE_ID!,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      // 7. Télécharger le PDF localement (backup)
      pdfDoc.save(`${documentLabelCap}-${documentNumber}.pdf`);

      toast.success(`${documentLabelCap} envoyée par email avec succès !`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Erreur envoi email:", error);
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setIsSendingEmailJS(false);
    }
  };

  // Envoi manuel via Zoho (fallback)
  const handleSendManual = async () => {
    if (!email) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Générer et télécharger le PDF
      const pdfDoc = await pdfGenerator();
      pdfDoc.save(`${documentLabelCap}-${documentNumber}.pdf`);

      // 2. Ouvrir Zoho Mail compose dans un nouvel onglet
      window.open("https://mail.zoho.eu/zm/#compose", "_blank");

      // 3. Afficher les infos à copier
      toast.success(
        `PDF téléchargé ! Dans Zoho Mail :\n• Destinataire : ${email}\n• Joignez le PDF téléchargé`,
        { duration: 8000 }
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de la génération du PDF");
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
              ? "Le PDF sera uploadé et un lien de téléchargement sera envoyé au client."
              : "Le PDF sera téléchargé et Zoho Mail s'ouvrira pour l'envoi."}
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
