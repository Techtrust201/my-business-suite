import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceEmailRequest {
  invoiceId: string;
  recipientEmail: string;
  pdfBase64: string;
  documentType: 'invoice' | 'quote';
  documentNumber: string;
  subject?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-invoice-email function");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      invoiceId, 
      recipientEmail, 
      pdfBase64, 
      documentType,
      documentNumber,
      subject: customSubject,
      message: customMessage 
    }: SendInvoiceEmailRequest = await req.json();

    console.log(`Sending ${documentType} ${documentNumber} to ${recipientEmail}`);

    // Get organization info for the "from" field
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      console.error("User not found");
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      console.error("Organization not found");
      return new Response(
        JSON.stringify({ error: "Organisation non trouvée" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: organization } = await supabase
      .from("organizations")
      .select("name, email")
      .eq("id", profile.organization_id)
      .single();

    const organizationName = organization?.name || "Votre fournisseur";
    const documentLabel = documentType === 'invoice' ? 'Facture' : 'Devis';
    const documentFilename = documentType === 'invoice' 
      ? `Facture-${documentNumber}.pdf` 
      : `Devis-${documentNumber}.pdf`;

    const defaultSubject = `${documentLabel} ${documentNumber} - ${organizationName}`;
    const defaultMessage = documentType === 'invoice'
      ? `Bonjour,\n\nVeuillez trouver ci-joint la facture ${documentNumber}.\n\nPour des raisons de sécurité et de gestion des données, le lien de téléchargement restera disponible pendant 90 jours à compter de la réception de cet email. Passé ce délai, le document sera automatiquement supprimé de notre espace de stockage.\n\nNous vous remercions pour votre confiance.\n\nCordialement,\n${organizationName}`
      : `Bonjour,\n\nVeuillez trouver ci-joint le devis ${documentNumber}.\n\nPour des raisons de sécurité et de gestion des données, le lien de téléchargement restera disponible pendant 90 jours à compter de la réception de cet email. Passé ce délai, le document sera automatiquement supprimé de notre espace de stockage.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\n${organizationName}`;

    // Decode base64 PDF
    const pdfBuffer = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    console.log("Sending email via Resend...");

    const emailResponse = await resend.emails.send({
      from: `${organizationName} <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: customSubject || defaultSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p style="white-space: pre-line;">${customMessage || defaultMessage}</p>
        </div>
      `,
      attachments: [
        {
          filename: documentFilename,
          content: pdfBuffer,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    // Update invoice/quote status to "sent" if applicable
    if (documentType === 'invoice') {
      await supabase
        .from("invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", invoiceId)
        .eq("status", "draft");
    } else {
      await supabase
        .from("quotes")
        .update({ status: "sent" })
        .eq("id", invoiceId)
        .eq("status", "draft");
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invoice-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
