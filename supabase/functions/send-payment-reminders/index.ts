import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  handlePreflight,
  isAuthorizedCron,
  jsonResponse,
} from "../_shared/security.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";
const REMINDER_INTERVAL_DAYS = 7;

interface OverdueInvoice {
  id: string;
  number: string;
  due_date: string;
  total: number;
  amount_paid: number;
  contact: {
    id: string;
    email: string | null;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  organization_id: string;
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
};

// Anti-injection HTML dans les emails de relance. Toutes les variables
// issues de la DB (nom org, client, numero facture, etc.) sont escapees.
const escapeHtml = (str: string): string =>
  str.replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!)
  );

const sanitizeSubject = (s: string): string =>
  s.replace(/[\r\n]+/g, " ").slice(0, 200);

const handler = async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  // N5 : auth via secret cron uniquement, plus d'invocation publique.
  if (!isAuthorizedCron(req)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: buildCorsHeaders(req),
    });
  }

  try {
    console.log("Starting send-payment-reminders function");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];
    const reminderCutoff = new Date(
      Date.now() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // N5 : garde anti-double-relance — on ne relance pas si une relance
    // a deja ete envoyee dans les REMINDER_INTERVAL_DAYS derniers jours.
    const { data: overdueInvoices, error: fetchError } = await supabase
      .from("invoices")
      .select(
        `
        id,
        number,
        due_date,
        total,
        amount_paid,
        organization_id,
        last_reminder_sent_at,
        contact:contacts(
          id,
          email,
          company_name,
          first_name,
          last_name
        )
      `,
      )
      .lt("due_date", today)
      .not("status", "in", '("paid","cancelled")')
      .not("contact_id", "is", null)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${reminderCutoff}`);

    if (fetchError) {
      console.error("Error fetching overdue invoices");
      throw fetchError;
    }

    const invoicesCount = overdueInvoices?.length || 0;
    console.log(`Found ${invoicesCount} overdue invoices to remind`);

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return jsonResponse(
        { message: "Aucune facture en retard à relancer", sent: 0 },
        200,
        req,
      );
    }

    const orgIds = [
      ...new Set(overdueInvoices.map((inv) => inv.organization_id)),
    ];
    const { data: organizations } = await supabase
      .from("organizations")
      .select("id, name, email, phone")
      .in("id", orgIds);

    const orgMap = new Map(organizations?.map((org) => [org.id, org]) || []);

    let successCount = 0;
    let failureCount = 0;

    for (const invoice of overdueInvoices) {
      const typedInvoice = invoice as unknown as OverdueInvoice;
      const contact = typedInvoice.contact;

      if (!contact?.email) {
        failureCount++;
        continue;
      }

      const organization = orgMap.get(typedInvoice.organization_id);
      const organizationName = organization?.name || "Votre fournisseur";
      const clientName =
        contact.company_name ||
        `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
        "Client";
      const balanceDue = (typedInvoice.total || 0) - (typedInvoice.amount_paid || 0);
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(typedInvoice.due_date).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const safeOrgName = escapeHtml(organizationName);
      const safeClientName = escapeHtml(clientName);
      const safeNumber = escapeHtml(typedInvoice.number);
      const safeOrgPhone = organization?.phone ? escapeHtml(organization.phone) : "";
      const safeOrgEmail = organization?.email ? escapeHtml(organization.email) : "";

      try {
        await resend.emails.send({
          from: `${organizationName} <${RESEND_FROM}>`,
          to: [contact.email],
          subject: sanitizeSubject(
            `Rappel: Facture ${typedInvoice.number} - Paiement en retard`,
          ),
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #dc2626;">Rappel de paiement</h2>

              <p>Bonjour ${safeClientName},</p>

              <p>Nous vous rappelons que la facture <strong>${safeNumber}</strong>
              d'un montant de <strong>${escapeHtml(formatPrice(balanceDue))}</strong>
              est en retard de <strong>${daysOverdue} jour(s)</strong>.</p>

              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Facture N°:</strong> ${safeNumber}</p>
                <p style="margin: 8px 0 0 0;"><strong>Échéance:</strong> ${escapeHtml(new Date(typedInvoice.due_date).toLocaleDateString("fr-FR"))}</p>
                <p style="margin: 8px 0 0 0;"><strong>Montant dû:</strong> ${escapeHtml(formatPrice(balanceDue))}</p>
              </div>

              <p>Nous vous invitons à régulariser cette situation dans les plus brefs délais.</p>

              <p>Si vous avez déjà effectué ce paiement, nous vous prions de ne pas tenir compte de ce message.</p>

              <p>Pour toute question, n'hésitez pas à nous contacter${safeOrgPhone ? ` au ${safeOrgPhone}` : ""}${safeOrgEmail ? ` ou par email à ${safeOrgEmail}` : ""}.</p>

              <p style="margin-top: 30px;">Cordialement,<br><strong>${safeOrgName}</strong></p>
            </div>
          `,
        });

        // N5 : marquer la relance et basculer en overdue (idempotent).
        await supabase
          .from("invoices")
          .update({
            status: "overdue",
            last_reminder_sent_at: new Date().toISOString(),
          })
          .eq("id", typedInvoice.id);

        successCount++;
      } catch (emailError: unknown) {
        const message = emailError instanceof Error ? emailError.message : "unknown";
        console.error(`Resend failure for invoice ${typedInvoice.id}: ${message}`);
        failureCount++;
      }
    }

    console.log(
      `Reminders: ${successCount} sent, ${failureCount} failed, total scanned ${invoicesCount}`,
    );

    return jsonResponse(
      {
        sent: successCount,
        failed: failureCount,
        scanned: invoicesCount,
      },
      200,
      req,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Error in send-payment-reminders:", message);
    return jsonResponse({ error: "Internal error" }, 500, req);
  }
};

serve(handler);
