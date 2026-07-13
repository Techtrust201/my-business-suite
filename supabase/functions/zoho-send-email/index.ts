import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const ZOHO_TOKEN_URL = 'https://accounts.zoho.eu/oauth/v2/token';
const ZOHO_MAIL_API = 'https://mail.zoho.eu/api';

const BodySchema = z.object({
  recipient: z.string().email(),
  subject: z.string().min(1).max(998),
  message: z.string().min(1),
  documentNumber: z.string().min(1).max(200),
  documentType: z.enum(['invoice', 'quote']),
  pdfBase64: z.string().min(1),
});

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 12px 0">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function refreshIfNeeded(admin: any, integration: any) {
  const expiresAt = new Date(integration.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return integration.access_token;

  const clientId = Deno.env.get('ZOHO_CLIENT_ID')!;
  const clientSecret = Deno.env.get('ZOHO_CLIENT_SECRET')!;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: integration.refresh_token,
  });
  const res = await fetch(ZOHO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`Refresh token Zoho échoué: ${JSON.stringify(json)}`);
  }
  const newAccess = json.access_token as string;
  const newExpires = new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString();
  await admin
    .from('zoho_integrations')
    .update({ access_token: newAccess, expires_at: newExpires })
    .eq('id', integration.id);
  return newAccess;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supa = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Utilisateur invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Paramètres invalides', details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const { recipient, subject, message, documentNumber, documentType, pdfBase64 } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: 'Aucune organisation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: integration } = await admin
      .from('zoho_integrations')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    if (!integration) {
      return new Response(
        JSON.stringify({ error: 'Zoho non connecté. Configurez-le dans Paramètres.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const accessToken = await refreshIfNeeded(admin, integration);
    const accountId = integration.zoho_account_id;

    // 1. Upload attachment
    const pdfBytes = base64ToBytes(pdfBase64);
    const fileName = `${documentType === 'invoice' ? 'Facture' : 'Devis'}-${documentNumber}.pdf`;
    const uploadUrl = `${ZOHO_MAIL_API}/accounts/${accountId}/messages/attachments?uploadType=multipart&fileName=${encodeURIComponent(fileName)}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/pdf',
      },
      body: pdfBytes,
    });
    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok || !uploadJson?.data) {
      console.error('Zoho attachment upload failed', uploadJson);
      return new Response(
        JSON.stringify({ error: 'Upload pièce jointe échoué', details: uploadJson }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const attData = Array.isArray(uploadJson.data) ? uploadJson.data[0] : uploadJson.data;
    const attachment = {
      storeName: attData.storeName,
      attachmentPath: attData.attachmentPath,
      attachmentName: attData.attachmentName || fileName,
    };

    // 2. Send email
    const sendUrl = `${ZOHO_MAIL_API}/accounts/${accountId}/messages`;
    const sendBody = {
      fromAddress: integration.email,
      toAddress: recipient,
      subject,
      content: textToHtml(message),
      mailFormat: 'html',
      attachments: [attachment],
    };
    const sendRes = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendBody),
    });
    const sendJson = await sendRes.json();
    if (!sendRes.ok || sendJson?.status?.code >= 400) {
      console.error('Zoho send failed', sendJson);
      return new Response(
        JSON.stringify({ error: "Envoi Zoho échoué", details: sendJson }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true, from: integration.email }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('zoho-send-email error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
