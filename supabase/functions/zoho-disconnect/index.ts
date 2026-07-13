import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ZOHO_REVOKE_URL = 'https://accounts.zoho.eu/oauth/v2/token/revoke';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const { data: userData } = await supa.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: 'Utilisateur invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: integration } = await admin
      .from('user_email_integrations')
      .select('id, refresh_token')
      .eq('user_id', userData.user.id)
      .eq('provider', 'zoho')
      .maybeSingle();

    if (integration) {
      // Révocation côté Zoho (best effort)
      try {
        await fetch(`${ZOHO_REVOKE_URL}?token=${encodeURIComponent(integration.refresh_token)}`, {
          method: 'POST',
        });
      } catch (e) {
        console.warn('Zoho revoke best-effort failed');
      }
      await admin.from('user_email_integrations').delete().eq('id', integration.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
