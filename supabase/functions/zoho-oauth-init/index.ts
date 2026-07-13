import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ZOHO_AUTH_URL = 'https://accounts.zoho.eu/oauth/v2/auth';
const SCOPES = [
  'ZohoMail.messages.CREATE',
  'ZohoMail.accounts.READ',
  'ZohoMail.attachments.CREATE',
].join(',');

async function signState(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const clientId = Deno.env.get('ZOHO_CLIENT_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'ZOHO_CLIENT_ID non configuré' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const url = new URL(req.url);
    const returnUrl = url.searchParams.get('return_url') || '';
    const redirectUri = `${supabaseUrl}/functions/v1/zoho-oauth-callback`;

    const statePayload = JSON.stringify({
      uid: userData.user.id,
      org: profile.organization_id,
      ret: returnUrl,
      ts: Date.now(),
    });
    const stateB64 = btoa(statePayload)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const sig = await signState(stateB64, serviceKey);
    const state = `${stateB64}.${sig}`;

    const authUrl = new URL(ZOHO_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('zoho-oauth-init error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
