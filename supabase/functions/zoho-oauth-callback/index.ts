import { createClient } from 'npm:@supabase/supabase-js@2';

const ZOHO_TOKEN_URL = 'https://accounts.zoho.eu/oauth/v2/token';
const ZOHO_ACCOUNTS_URL = 'https://mail.zoho.eu/api/accounts';

async function verifyState(state: string, secret: string): Promise<any | null> {
  const [b64, sig] = state.split('.');
  if (!b64 || !sig) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = await crypto.subtle.sign('HMAC', key, enc.encode(b64));
  const expB64 = btoa(String.fromCharCode(...new Uint8Array(expected)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  if (expB64 !== sig) return null;
  try {
    const pad = b64 + '==='.slice((b64.length + 3) % 4);
    const json = atob(pad.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Zoho</title><style>body{font-family:system-ui;padding:40px;max-width:600px;margin:auto;text-align:center}h1{color:#111}p{color:#555}a{color:#3b82f6}</style></head><body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return html(`<h1>Connexion Zoho refusée</h1><p>${error}</p>`, 400);
    }
    if (!code || !state) {
      return html('<h1>Requête invalide</h1><p>Paramètres manquants.</p>', 400);
    }

    const clientId = Deno.env.get('ZOHO_CLIENT_ID');
    const clientSecret = Deno.env.get('ZOHO_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!clientId || !clientSecret) {
      return html('<h1>Configuration Zoho manquante</h1>', 500);
    }

    const parsed = await verifyState(state, serviceKey);
    if (!parsed) {
      return html('<h1>State invalide</h1>', 400);
    }

    const redirectUri = `${supabaseUrl}/functions/v1/zoho-oauth-callback`;

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });
    const tokenRes = await fetch(ZOHO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error('Zoho token error', tokenJson);
      return html(`<h1>Erreur token Zoho</h1><pre>${JSON.stringify(tokenJson)}</pre>`, 400);
    }

    const accessToken: string = tokenJson.access_token;
    const refreshToken: string = tokenJson.refresh_token;
    const expiresIn: number = tokenJson.expires_in ?? 3600;

    // Get Zoho account id + email
    const accRes = await fetch(ZOHO_ACCOUNTS_URL, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });
    const accJson = await accRes.json();
    if (!accRes.ok || !accJson?.data?.[0]) {
      console.error('Zoho accounts error', accJson);
      return html('<h1>Impossible de récupérer le compte Zoho</h1>', 400);
    }
    const account = accJson.data[0];
    const zohoAccountId: string = String(account.accountId);
    const email: string =
      account.primaryEmailAddress ||
      account.mailboxAddress ||
      account.incomingUserName ||
      '';

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: upsertErr } = await admin
      .from('zoho_integrations')
      .upsert(
        {
          organization_id: parsed.org,
          zoho_account_id: zohoAccountId,
          email,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          created_by: parsed.uid,
        },
        { onConflict: 'organization_id' },
      );

    if (upsertErr) {
      console.error('upsert error', upsertErr);
      return html(`<h1>Erreur enregistrement</h1><pre>${upsertErr.message}</pre>`, 500);
    }

    const ret = typeof parsed.ret === 'string' && parsed.ret ? parsed.ret : '/parametres';
    return html(
      `<h1>✅ Zoho Mail connecté</h1><p>Compte : <strong>${email}</strong></p><p><a href="${ret}">Revenir à l'application</a></p><script>setTimeout(()=>{window.location.href=${JSON.stringify(ret)}},1500)</script>`,
    );
  } catch (e) {
    console.error('callback error', e);
    return html(`<h1>Erreur</h1><pre>${(e as Error).message}</pre>`, 500);
  }
});
