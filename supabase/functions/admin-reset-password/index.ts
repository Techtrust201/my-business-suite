import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// LISTE BLANCHE STRICTE - Ne JAMAIS modifier sans autorisation explicite
const AUTHORIZED_EMAILS = [
  'hugoportier3@gmail.com',
  'contact@tech-trust.fr'
];

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const specialChars = '!@#$%&*';
  let password = '';
  
  // 10 caractères alphanumériques
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // 2 caractères spéciaux
  for (let i = 0; i < 2; i++) {
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  }
  
  return password;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérification du header Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[ADMIN-RESET] Tentative sans token');
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer client Supabase avec le token de l'utilisateur
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Vérifier l'utilisateur connecté
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.log('[ADMIN-RESET] Token invalide');
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminEmail = claimsData.user.email?.toLowerCase();
    const adminUserId = claimsData.user.id;

    // VÉRIFICATION CRITIQUE : L'utilisateur est-il dans la liste blanche ?
    if (!adminEmail || !AUTHORIZED_EMAILS.includes(adminEmail)) {
      console.log(`[ADMIN-RESET] ACCÈS REFUSÉ pour: ${adminEmail}`);
      return new Response(
        JSON.stringify({ error: 'Accès non autorisé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les données de la requête
    const { targetEmail } = await req.json();

    if (!targetEmail || typeof targetEmail !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email cible requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ADMIN-RESET] Admin ${adminEmail} demande reset pour: ${targetEmail}`);

    // Créer client admin avec Service Role Key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Trouver l'utilisateur cible
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('[ADMIN-RESET] Erreur listUsers:', listError);
      return new Response(
        JSON.stringify({ error: 'Erreur serveur' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUser = usersData.users.find(
      u => u.email?.toLowerCase() === targetEmail.toLowerCase()
    );

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer un nouveau mot de passe
    const tempPassword = generateSecurePassword();

    // Réinitialiser le mot de passe
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUser.id,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('[ADMIN-RESET] Erreur updateUser:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la réinitialisation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log dans audit_logs si la table existe
    try {
      const { data: orgData } = await adminClient
        .from('profiles')
        .select('organization_id')
        .eq('id', adminUserId)
        .single();

      if (orgData?.organization_id) {
        await adminClient.from('audit_logs').insert({
          organization_id: orgData.organization_id,
          user_id: adminUserId,
          action: 'admin_password_reset',
          entity_type: 'user',
          entity_id: targetUser.id,
          details: { target_email: targetEmail, admin_email: adminEmail }
        });
      }
    } catch (auditError) {
      // Ignore si la table n'existe pas
      console.log('[ADMIN-RESET] Audit log skipped:', auditError);
    }

    console.log(`[ADMIN-RESET] SUCCESS: ${adminEmail} a réinitialisé ${targetEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tempPassword,
        message: 'Mot de passe réinitialisé avec succès'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ADMIN-RESET] Erreur:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
