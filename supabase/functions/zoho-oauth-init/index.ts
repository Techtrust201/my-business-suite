import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ZOHO_AUTH_URL = 'https://accounts.zoho.eu/oauth/v2/auth';
const SCOPES = [
  'ZohoMail.messages.CREATE',
  'ZohoMail.accounts.READ',
  'ZohoMail.attachments.CREATE',
];
const STATE_TTL_MINUTES = 10;

function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
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
    if (!authHeader?.startsWith('Bearer ')) {
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

    const url = new URL(req.url);
    const returnUrl = url.searchParams.get('return_url') || '/parametres?tab=organization';
    const redirectUri = `${supabaseUrl}/functions/v1/zoho-oauth-callback`;

    // Génère un state aléatoire lié à l'utilisateur, TTL 10 min, à usage unique
    const state = randomState();
    const expiresAt = new Date(Date.now() + STATE_TTL_MINUTES * 60_000).toISOString();

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: insErr } = await admin.from('oauth_states').insert({
      state,
      user_id: userData.user.id,
      provider: 'zoho',
      return_url: returnUrl,
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error('oauth_states insert failed', insErr);
      return new Response(JSON.stringify({ error: 'Erreur interne (state)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Nettoyage best-effort des états expirés
    await admin.from('oauth_states').delete().lt('expires_at', new Date().toISOString());

    const authUrl = new URL(ZOHO_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', SCOPES.join(','));
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
