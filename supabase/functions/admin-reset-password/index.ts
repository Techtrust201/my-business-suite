import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  handlePreflight,
  jsonResponse,
} from "../_shared/security.ts";

// N2 / N3 / N14 :
//  - N2 : la fonction ne retourne plus de mot de passe en clair. Elle
//         envoie un email de reinitialisation (recovery link) via Resend.
//  - N3 : autorisation scopee a l'organisation (admin de la meme org)
//         + fallback "platform admin" lu depuis la table public.platform_admins
//         (source unique de verite cote DB, plus aucune variable d'env CSV).
//  - N14 : si jamais on regenerait un mot de passe local, c'est via
//         crypto.getRandomValues (helper conserve en cas de besoin).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") ||
  "https://my-business-suite.vercel.app";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!)
  );
}

// Generation sure si jamais on veut un mot de passe local (non utilise dans
// le flux courant — on prefere le recovery link).
function _generateSecurePassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const specialChars = "!@#$%&*";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars.charAt(bytes[i] % chars.length);
  }
  for (let i = 10; i < 12; i++) {
    out += specialChars.charAt(bytes[i] % specialChars.length);
  }
  return out;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Non autorise" }, 401, req);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth
      .getUser(token);

    if (claimsError || !claimsData?.user) {
      return jsonResponse({ error: "Token invalide" }, 401, req);
    }

    const callerUserId = claimsData.user.id;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON invalide" }, 400, req);
    }
    const { targetEmail } = (body || {}) as { targetEmail?: unknown };
    if (typeof targetEmail !== "string" || !targetEmail.trim()) {
      return jsonResponse({ error: "Email cible requis" }, 400, req);
    }
    const normalizedTarget = targetEmail.trim().toLowerCase();

    // Lookup utilisateur cible (pagination defensive jusqu'a 10000 users).
    let targetUser: { id: string; email?: string } | null = null;
    for (let page = 1; page <= 10; page++) {
      const { data: usersData, error: listError } = await adminClient.auth.admin
        .listUsers({ page, perPage: 1000 });
      if (listError) {
        console.error("[ADMIN-RESET] listUsers error");
        return jsonResponse({ error: "Erreur serveur" }, 500, req);
      }
      const found = usersData.users.find((u) =>
        u.email?.toLowerCase() === normalizedTarget
      );
      if (found) {
        targetUser = { id: found.id, email: found.email };
        break;
      }
      if (usersData.users.length < 1000) break;
    }

    if (!targetUser) {
      // N'expose pas l'existence d'un user via le code retour.
      return jsonResponse(
        { success: true, sent: false, reason: "not_found" },
        200,
        req,
      );
    }

    // N3 — Autorisation : platform admin (table public.platform_admins) OU
    // admin de la meme org. La table est la source unique de verite : pour
    // ajouter/retirer un platform admin, INSERT/DELETE dans Supabase Studio.
    const { data: platformAdminRow, error: platformAdminError } =
      await adminClient
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", callerUserId)
        .maybeSingle();

    if (platformAdminError) {
      console.error("[ADMIN-RESET] platform_admins lookup error");
      return jsonResponse({ error: "Erreur serveur" }, 500, req);
    }

    const isPlatformAdmin = !!platformAdminRow;

    let isOrgAdminOfTarget = false;
    let targetOrgId: string | null = null;

    if (!isPlatformAdmin) {
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("organization_id")
        .eq("id", targetUser.id)
        .maybeSingle();

      targetOrgId = targetProfile?.organization_id ?? null;

      if (targetOrgId) {
        const { data: callerRoles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", callerUserId)
          .eq("organization_id", targetOrgId);

        isOrgAdminOfTarget = !!callerRoles?.some((r) => r.role === "admin");
      }
    }

    if (!isPlatformAdmin && !isOrgAdminOfTarget) {
      console.log(
        `[ADMIN-RESET] forbidden caller=${callerUserId} target=${targetUser.id}`,
      );
      return jsonResponse({ error: "Acces non autorise" }, 403, req);
    }

    // N2 — Generation d'un recovery link (pas de mdp en clair en sortie).
    const { data: linkData, error: linkError } = await adminClient.auth.admin
      .generateLink({
        type: "recovery",
        email: normalizedTarget,
        options: { redirectTo: `${PUBLIC_APP_URL}/auth` },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[ADMIN-RESET] generateLink error");
      return jsonResponse(
        { error: "Erreur lors de la generation du lien" },
        500,
        req,
      );
    }

    const recoveryLink = linkData.properties.action_link;

    // Envoi via Resend (le RESEND_API_KEY etant deja utilise pour les autres
    // fonctions). Si non configure, on echoue plutot que de renvoyer le lien
    // au client.
    if (!RESEND_API_KEY) {
      console.error("[ADMIN-RESET] RESEND_API_KEY non configure");
      return jsonResponse(
        { error: "Service email non configure" },
        500,
        req,
      );
    }

    const resend = new Resend(RESEND_API_KEY);
    const safeLink = escapeHtml(recoveryLink);

    await resend.emails.send({
      from: `Réinitialisation mot de passe <${RESEND_FROM}>`,
      to: [normalizedTarget],
      subject: "Réinitialisation de votre mot de passe",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Réinitialisation de mot de passe</h2>
          <p>Un administrateur a demandé la réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe (lien valable 1 heure) :</p>
          <p style="margin: 24px 0;">
            <a href="${safeLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p style="color: #666; font-size: 13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>
      `,
    });

    // Audit log (best effort) — scoped a l'org si on la connait.
    try {
      const orgIdForLog = targetOrgId ?? null;
      if (orgIdForLog) {
        await adminClient.from("audit_logs").insert({
          organization_id: orgIdForLog,
          user_id: callerUserId,
          action: "admin_password_reset_link_sent",
          entity_type: "user",
          entity_id: targetUser.id,
          details: {
            target_email_hash: await hashEmail(normalizedTarget),
            platform_admin: isPlatformAdmin,
          },
        });
      }
    } catch (e) {
      console.log("[ADMIN-RESET] audit skipped");
    }

    console.log(
      `[ADMIN-RESET] recovery link sent caller=${callerUserId} target=${targetUser.id} platform_admin=${isPlatformAdmin}`,
    );

    return jsonResponse(
      {
        success: true,
        method: "recovery_email_sent",
        sentAt: new Date().toISOString(),
      },
      200,
      req,
    );
  } catch (error) {
    console.error(
      "[ADMIN-RESET] unexpected error",
      error instanceof Error ? error.message : "unknown",
    );
    return jsonResponse({ error: "Erreur serveur" }, 500, req);
  }
});

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
