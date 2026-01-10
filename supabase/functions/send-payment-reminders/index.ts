import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-payment-reminders function");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date for comparison
    const today = new Date().toISOString().split('T')[0];

    // Find all overdue invoices that are not paid or cancelled
    const { data: overdueInvoices, error: fetchError } = await supabase
      .from("invoices")
      .select(`
        id,
        number,
        due_date,
        total,
        amount_paid,
        organization_id,
        contact:contacts(
          id,
          email,
          company_name,
          first_name,
          last_name
        )
      `)
      .lt("due_date", today)
      .not("status", "in", '("paid","cancelled")')
      .not("contact_id", "is", null);

    if (fetchError) {
      console.error("Error fetching overdue invoices:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${overdueInvoices?.length || 0} overdue invoices`);

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(
        JSON.stringify({ message: "Aucune facture en retard à relancer" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Group invoices by organization to get organization details
    const orgIds = [...new Set(overdueInvoices.map(inv => inv.organization_id))];
    const { data: organizations } = await supabase
      .from("organizations")
      .select("id, name, email, phone")
      .in("id", orgIds);

    const orgMap = new Map(organizations?.map(org => [org.id, org]) || []);

    const results: { invoiceNumber: string; success: boolean; error?: string }[] = [];

    for (const invoice of overdueInvoices) {
      const typedInvoice = invoice as unknown as OverdueInvoice;
      const contact = typedInvoice.contact;
      
      if (!contact?.email) {
        console.log(`Skipping invoice ${typedInvoice.number}: no contact email`);
        results.push({ invoiceNumber: typedInvoice.number, success: false, error: "Pas d'email client" });
        continue;
      }

      const organization = orgMap.get(typedInvoice.organization_id);
      const organizationName = organization?.name || "Votre fournisseur";
      const clientName = contact.company_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
      const balanceDue = (typedInvoice.total || 0) - (typedInvoice.amount_paid || 0);
      const daysOverdue = Math.floor((new Date().getTime() - new Date(typedInvoice.due_date).getTime()) / (1000 * 60 * 60 * 24));

      try {
        console.log(`Sending reminder for invoice ${typedInvoice.number} to ${contact.email}`);

        await resend.emails.send({
          from: `${organizationName} <onboarding@resend.dev>`,
          to: [contact.email],
          subject: `Rappel: Facture ${typedInvoice.number} - Paiement en retard`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #dc2626;">Rappel de paiement</h2>
              
              <p>Bonjour ${clientName},</p>
              
              <p>Nous vous rappelons que la facture <strong>${typedInvoice.number}</strong> 
              d'un montant de <strong>${formatPrice(balanceDue)}</strong> 
              est en retard de <strong>${daysOverdue} jour(s)</strong>.</p>
              
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Facture N°:</strong> ${typedInvoice.number}</p>
                <p style="margin: 8px 0 0 0;"><strong>Échéance:</strong> ${new Date(typedInvoice.due_date).toLocaleDateString('fr-FR')}</p>
                <p style="margin: 8px 0 0 0;"><strong>Montant dû:</strong> ${formatPrice(balanceDue)}</p>
              </div>
              
              <p>Nous vous invitons à régulariser cette situation dans les plus brefs délais.</p>
              
              <p>Si vous avez déjà effectué ce paiement, nous vous prions de ne pas tenir compte de ce message.</p>
              
              <p>Pour toute question, n'hésitez pas à nous contacter${organization?.phone ? ` au ${organization.phone}` : ''}${organization?.email ? ` ou par email à ${organization.email}` : ''}.</p>
              
              <p style="margin-top: 30px;">Cordialement,<br><strong>${organizationName}</strong></p>
            </div>
          `,
        });

        // Update invoice status to overdue
        await supabase
          .from("invoices")
          .update({ status: "overdue" })
          .eq("id", typedInvoice.id);

        results.push({ invoiceNumber: typedInvoice.number, success: true });
        console.log(`Reminder sent for invoice ${typedInvoice.number}`);
      } catch (emailError: any) {
        console.error(`Error sending reminder for invoice ${typedInvoice.number}:`, emailError);
        results.push({ invoiceNumber: typedInvoice.number, success: false, error: emailError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Reminders sent: ${successCount}/${results.length}`);

    return new Response(
      JSON.stringify({ 
        message: `${successCount} rappel(s) envoyé(s) sur ${results.length} facture(s) en retard`,
        details: results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-payment-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
