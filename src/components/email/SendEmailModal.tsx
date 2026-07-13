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
import { Send, Loader2, ExternalLink, Mail } from "lucide-react";
import { toast } from "sonner";
import emailjs from "@emailjs/browser";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useZohoIntegration } from "@/hooks/useZohoIntegration";
import { generatePdfPreview } from "@/lib/pdfPreviewGenerator";

interface SendEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentNumber: string;
  documentType: "invoice" | "quote";
  recipientEmail?: string;
  organizationName?: string;
  customSubject?: string;
  customMessage?: string;
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
  customSubject,
  customMessage,
  pdfGenerator,
  onSuccess,
}: SendEmailModalProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingEmailJS, setIsSendingEmailJS] = useState(false);

  const { organization } = useOrganization();
  const { user } = useAuth();
  const { integration: zohoIntegration } = useZohoIntegration();

  const documentLabel = documentType === "invoice" ? "facture" : "devis";
  const documentLabelCap = documentType === "invoice" ? "Facture" : "Devis";

  const defaultSubject = customSubject || `${documentLabelCap} ${documentNumber}${
    organizationName ? ` - ${organizationName}` : ""
  }`;

  const defaultMessage =
    documentType === "invoice"
      ? `Bonjour,

Veuillez trouver ci-dessous votre facture ${documentNumber}.

Pour des raisons de sécurité et de gestion des données,
le lien de téléchargement restera disponible pendant 90 jours à compter de la réception de cet email.
Passé ce délai, le document sera automatiquement supprimé de notre espace de stockage.

Vous pouvez télécharger le PDF complet en cliquant sur le bouton ou l'image dans cet email.

Nous vous remercions pour votre confiance.

Cordialement${organizationName ? `,\n${organizationName}` : ""}`
      : `Bonjour,

Veuillez trouver ci-dessous votre devis ${documentNumber}.

Pour des raisons de sécurité et de gestion des données,
le lien de téléchargement restera disponible pendant 90 jours à compter de la réception de cet email.
Passé ce délai, le document sera automatiquement supprimé de notre espace de stockage.

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

      // Le bucket "documents" est prive (cf. N6) : on genere des signed URLs
      // a duree de vie de 90 jours, ce qui correspond a la fenetre de
      // conservation annoncee dans le message par defaut. Au-dela, le cron
      // cleanup-old-documents purge les fichiers.
      const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 90;

      const pdfPath = `${basePath}/${pdfFileName}`;
      const previewPath = `${basePath}/${previewFileName}`;

      const pdfBlob = pdfDoc.output("blob");
      const { error: pdfUploadError } = await supabase.storage
        .from("documents")
        .upload(pdfPath, pdfBlob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (pdfUploadError) {
        console.error("PDF upload error");
        throw new Error(`Erreur upload PDF: ${pdfUploadError.message}`);
      }

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
          .upload(previewPath, previewBlob, {
            contentType: "image/png",
            upsert: false,
          });

        if (!previewUploadError) {
          const { data: previewSigned } = await supabase.storage
            .from("documents")
            .createSignedUrl(previewPath, SIGNED_URL_TTL_SECONDS);
          previewUrl = previewSigned?.signedUrl ?? "";
        } else {
          console.warn("Preview upload failed");
        }
      } catch (previewError) {
        console.warn("Preview generation failed, continuing without preview");
      }

      const { data: pdfSigned, error: signError } = await supabase.storage
        .from("documents")
        .createSignedUrl(pdfPath, SIGNED_URL_TTL_SECONDS);

      if (signError || !pdfSigned?.signedUrl) {
        throw new Error("Impossible de generer le lien securise du PDF");
      }
      const pdfUrl = pdfSigned.signedUrl;

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
        { publicKey: EMAILJS_PUBLIC_KEY }
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

  // Envoi via Zoho Mail API (OAuth) - identique à "Envoyer" mais depuis Zoho + PJ auto
  const handleSendZoho = async () => {
    if (!email) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }
    if (!zohoIntegration) {
      toast.error(
        "Zoho Mail n'est pas connecté. Rendez-vous dans Paramètres → Organisation pour le connecter.",
        { duration: 8000 }
      );
      return;
    }

    setIsProcessing(true);
    try {
      // Générer le PDF puis convertir en base64
      const pdfDoc = await pdfGenerator();
      const pdfArrayBuffer = pdfDoc.output("arraybuffer");
      const bytes = new Uint8Array(pdfArrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const pdfBase64 = btoa(binary);

      const finalSubject = subject || defaultSubject;
      const finalMessage = message || defaultMessage;

      const { data, error } = await supabase.functions.invoke("zoho-send-email", {
        body: {
          recipient: email,
          subject: finalSubject,
          message: finalMessage,
          documentNumber,
          documentType,
          pdfBase64,
        },
      });

      if (error) {
        // Récupérer le vrai message d'erreur depuis le body
        let details = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.text === "function") {
            details = await ctx.text();
          }
        } catch {}
        throw new Error(details);
      }

      toast.success(
        `${documentLabelCap} envoyée depuis ${data?.from || zohoIntegration.email_address} avec le PDF joint !`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Erreur envoi Zoho:", err);
      toast.error(err.message || "Erreur lors de l'envoi via Zoho");
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

          {/* Envoi via Zoho Mail (API OAuth) */}
          <Button
            variant="secondary"
            onClick={handleSendZoho}
            disabled={!email || isProcessing || isSendingEmailJS || !zohoIntegration}
            title={
              !zohoIntegration
                ? "Connectez votre compte Zoho dans Paramètres → Organisation"
                : `Envoyer depuis ${zohoIntegration.email_address}`
            }
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {zohoIntegration ? "Envoyer via Zoho" : "Zoho non connecté"}
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
