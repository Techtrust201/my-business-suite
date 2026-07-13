import { createClient } from 'npm:@supabase/supabase-js@2';

const ZOHO_TOKEN_URL = 'https://accounts.zoho.eu/oauth/v2/token';
const ZOHO_ACCOUNTS_URL = 'https://mail.zoho.eu/api/accounts';

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Zoho</title><style>body{font-family:system-ui;padding:40px;max-width:600px;margin:auto;text-align:center}h1{color:#111}p{color:#555}a{color:#3b82f6;text-decoration:none;padding:8px 16px;background:#eff6ff;border-radius:6px}</style></head><body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');

    if (errorParam) {
      return html(`<h1>Connexion Zoho refusée</h1><p>${errorParam}</p>`, 400);
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

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Vérifier le state (unique, non expiré, non utilisé)
    const { data: stateRow, error: stateErr } = await admin
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .maybeSingle();

    if (stateErr || !stateRow) {
      return html('<h1>State OAuth invalide</h1><p>Recommencez la connexion depuis votre application.</p>', 400);
    }
    if (stateRow.used_at) {
      return html('<h1>State déjà utilisé</h1>', 400);
    }
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      await admin.from('oauth_states').delete().eq('state', state);
      return html('<h1>State expiré</h1><p>Recommencez la connexion.</p>', 400);
    }

    // Marquer immédiatement comme utilisé (empêche rejeu)
    await admin.from('oauth_states').update({ used_at: new Date().toISOString() }).eq('state', state);

    const userId: string = stateRow.user_id;
    const returnUrl: string = stateRow.return_url || '/parametres?tab=organization';

    // Récupérer l'organization_id de l'utilisateur (pour audit/logs)
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    const redirectUri = `${supabaseUrl}/functions/v1/zoho-oauth-callback`;

    // 2. Échanger le code contre les tokens
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
    const grantedScopes: string[] = typeof tokenJson.scope === 'string'
      ? tokenJson.scope.split(/[,\s]+/).filter(Boolean)
      : [];

    // 3. Récupérer le compte Zoho de l'utilisateur (accountId + email dynamique)
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
    const zohoUserId: string | null = account.zuid ? String(account.zuid) : null;
    const emailAddress: string =
      account.primaryEmailAddress ||
      account.mailboxAddress ||
      account.incomingUserName ||
      '';
    const displayName: string | null = account.displayName || account.firstName || null;

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 4. Upsert de l'intégration de CET utilisateur uniquement
    const { error: upsertErr } = await admin
      .from('user_email_integrations')
      .upsert(
        {
          user_id: userId,
          organization_id: profile?.organization_id ?? null,
          provider: 'zoho',
          provider_account_id: zohoAccountId,
          provider_user_id: zohoUserId,
          email_address: emailAddress,
          display_name: displayName,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: expiresAt,
          scopes: grantedScopes,
          datacenter: 'eu',
          status: 'active',
          connected_at: new Date().toISOString(),
          refreshed_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: 'user_id,provider' },
      );

    if (upsertErr) {
      console.error('upsert error', upsertErr);
      return html(`<h1>Erreur enregistrement</h1><pre>${upsertErr.message}</pre>`, 500);
    }

    // Nettoyage du state consommé
    await admin.from('oauth_states').delete().eq('state', state);

    return html(
      `<h1>✅ Zoho Mail connecté</h1><p>Compte : <strong>${emailAddress}</strong></p><p><a href="${returnUrl}">Revenir à l'application</a></p><script>setTimeout(()=>{window.location.href=${JSON.stringify(returnUrl)}},1200)</script>`,
    );
  } catch (e) {
    console.error('callback error', e);
    return html(`<h1>Erreur</h1><pre>${(e as Error).message}</pre>`, 500);
  }
});
