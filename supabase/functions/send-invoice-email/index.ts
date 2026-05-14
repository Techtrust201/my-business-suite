import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  handlePreflight,
  jsonResponse,
} from "../_shared/security.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";

// N10 : borne taille du PDF base64. ~10 Mo decode = ~13.5 Mo base64.
const MAX_PDF_BASE64_LENGTH = 13_500_000;

interface SendInvoiceEmailRequest {
  invoiceId: string;
  recipientEmail: string;
  pdfBase64: string;
  documentType: "invoice" | "quote";
  documentNumber: string;
  subject?: string;
  message?: string;
}

const escapeHtml = (str: string): string =>
  str.replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!)
  );

const sanitizeSubject = (s: string): string =>
  s.replace(/[\r\n]+/g, " ").slice(0, 200);

const isEmail = (s: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;

const handler = async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Non autorisé" }, 401, req);
    }

    let parsed: SendInvoiceEmailRequest;
    try {
      parsed = await req.json();
    } catch {
      return jsonResponse({ error: "JSON invalide" }, 400, req);
    }

    const {
      invoiceId,
      recipientEmail,
      pdfBase64,
      documentType,
      documentNumber,
      subject: customSubject,
      message: customMessage,
    } = parsed;

    if (!invoiceId || typeof invoiceId !== "string") {
      return jsonResponse({ error: "invoiceId requis" }, 400, req);
    }
    if (documentType !== "invoice" && documentType !== "quote") {
      return jsonResponse({ error: "documentType invalide" }, 400, req);
    }
    if (typeof recipientEmail !== "string" || !isEmail(recipientEmail)) {
      return jsonResponse({ error: "Email destinataire invalide" }, 400, req);
    }
    if (typeof documentNumber !== "string" || documentNumber.length > 100) {
      return jsonResponse({ error: "documentNumber invalide" }, 400, req);
    }
    if (typeof pdfBase64 !== "string") {
      return jsonResponse({ error: "pdfBase64 invalide" }, 400, req);
    }
    // N10 : refus immediat si la charge depasse la limite.
    if (pdfBase64.length === 0 || pdfBase64.length > MAX_PDF_BASE64_LENGTH) {
      return jsonResponse(
        { error: "PDF trop volumineux (max 10 Mo)" },
        413,
        req,
      );
    }

    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!user) {
      return jsonResponse({ error: "Utilisateur non trouvé" }, 401, req);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return jsonResponse({ error: "Organisation non trouvée" }, 400, req);
    }

    // N9 : verifier que le document appartient bien a l'organisation
    // de l'appelant AVANT toute action (envoi + update).
    const docTable = documentType === "invoice" ? "invoices" : "quotes";
    const { data: docRow, error: docError } = await supabase
      .from(docTable)
      .select("id, organization_id, status")
      .eq("id", invoiceId)
      .maybeSingle();

    if (docError) {
      console.error("[SEND-EMAIL] doc fetch error");
      return jsonResponse({ error: "Erreur serveur" }, 500, req);
    }

    if (!docRow) {
      return jsonResponse({ error: "Document introuvable" }, 404, req);
    }

    if (docRow.organization_id !== profile.organization_id) {
      console.log(
        `[SEND-EMAIL] cross-org refused user=${user.id} doc_org=${docRow.organization_id}`,
      );
      return jsonResponse({ error: "Accès interdit" }, 403, req);
    }

    const { data: organization } = await supabase
      .from("organizations")
      .select("name, email")
      .eq("id", profile.organization_id)
      .single();

    const organizationName = organization?.name || "Votre fournisseur";
    const documentLabel = documentType === "invoice" ? "Facture" : "Devis";
    const documentFilename = documentType === "invoice"
      ? `Facture-${documentNumber}.pdf`
      : `Devis-${documentNumber}.pdf`;

    const safeSubject = customSubject
      ? sanitizeSubject(customSubject)
      : null;
    const safeMessage = customMessage
      ? escapeHtml(customMessage.slice(0, 5000))
      : null;

    const defaultSubject =
      `${documentLabel} ${documentNumber} - ${organizationName}`;
    const defaultMessage = documentType === "invoice"
      ? `Bonjour,\n\nVeuillez trouver ci-joint la facture ${documentNumber}.\n\nPour des raisons de sécurité et de gestion des données, le lien de téléchargement restera disponible pendant 90 jours à compter de la réception de cet email. Passé ce délai, le document sera automatiquement supprimé de notre espace de stockage.\n\nNous vous remercions pour votre confiance.\n\nCordialement,\n${organizationName}`
      : `Bonjour,\n\nVeuillez trouver ci-joint le devis ${documentNumber}.\n\nPour des raisons de sécurité et de gestion des données, le lien de téléchargement restera disponible pendant 90 jours à compter de la réception de cet email. Passé ce délai, le document sera automatiquement supprimé de notre espace de stockage.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n${organizationName}`;

    let pdfBuffer: Uint8Array;
    try {
      pdfBuffer = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    } catch {
      return jsonResponse({ error: "PDF base64 invalide" }, 400, req);
    }

    // N21 : RESEND_FROM doit etre un domaine verifie cote Resend.
    await resend.emails.send({
      from: `${organizationName} <${RESEND_FROM}>`,
      to: [recipientEmail],
      subject: safeSubject || defaultSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p style="white-space: pre-line;">${safeMessage || escapeHtml(defaultMessage)}</p>
        </div>
      `,
      attachments: [
        {
          filename: documentFilename,
          content: pdfBuffer,
        },
      ],
    });

    // N9 : update scope avec organization_id (defense en profondeur en plus du
    // check fait juste avant).
    if (documentType === "invoice") {
      await supabase
        .from("invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", invoiceId)
        .eq("organization_id", profile.organization_id)
        .eq("status", "draft");
    } else {
      await supabase
        .from("quotes")
        .update({ status: "sent" })
        .eq("id", invoiceId)
        .eq("organization_id", profile.organization_id)
        .eq("status", "draft");
    }

    // Reponse minimaliste : ne pas exposer le payload Resend complet.
    return jsonResponse({ success: true }, 200, req);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("[SEND-EMAIL] error:", message);
    return jsonResponse({ error: "Erreur serveur" }, 500, req);
  }
};

serve(handler);
