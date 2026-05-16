## Plan de remédiation sécurité complète

Objectif : fixer **réellement** les 9 findings au lieu de les ignorer. Certains demandent des changements lourds — voici l'ordre et l'impact.

### 1. Buckets `receipts` et `documents` → privés + URLs signées
- Passer les 2 buckets en `public = false`
- Remplacer les policies `Anyone can view/read` par des policies org-scopées (folder = `organization_id`)
- Refactor `useSignedUrl` pour générer des signed URLs (1h pour receipts internes, 7 jours pour documents partagés)
- Mettre à jour tous les composants qui affichent ces fichiers (ExpenseDetails, ProspectAttachments, NoteAttachments, LogoUpload reste public)
- **Edge function `send-invoice-email`** : générer une signed URL longue durée (90 jours) au moment de l'envoi email, au lieu d'utiliser le public URL
- **Cleanup-old-documents** : OK, pas d'impact

### 2. Edge function `send-invoice-email` → `verify_jwt = true`
- Ajouter bloc `[functions.send-invoice-email] verify_jwt = true` dans `supabase/config.toml`
- Retirer le parsing manuel du header `Authorization` (déjà fait par la plateforme)
- Garder le check `getUser()` pour récupérer l'org

### 3. EmailJS → migration vers edge function Resend
- Supprimer l'intégration EmailJS dans `SendEmailModal` et `useInvitations`
- Tout passer par `send-invoice-email` (déjà en place avec Resend) + créer `send-invitation-email` pour les invites
- Retirer `VITE_EMAILJS_*` du `.env`
- Note : nécessite que `RESEND_API_KEY` soit configuré (à demander si pas déjà fait)

### 4. TOTP secret → vue `profiles_safe` + RPC chiffré
- Créer extension `pgsodium` (si pas déjà), Vault key
- Migrer `totp_secret` en `bytea` chiffré
- Créer vue `profiles_safe` SANS `totp_secret`, basculer tous les `SELECT profiles` du client vers `profiles_safe`
- RPC `enroll_totp()` et `verify_totp(code)` SECURITY DEFINER
- REVOKE SELECT (totp_secret) sur la table
- **Note** : Aucun user n'a actuellement de TOTP enrôlé (feature pas implémentée), donc pas de migration destructive — on prépare juste le terrain sécurisé.

### 5. Realtime → RLS sur `realtime.messages`
- Ajouter policy SELECT scope par `auth.uid()` sur le topic
- Bien que le risque actuel soit nul (postgres_changes only), ça ferme la porte pour le futur

### 6. Extension in public (warning Supabase)
- Déplacer `pg_net`, `pg_cron` (si présents) vers schéma `extensions`
- **Risque** : peut casser des cron jobs existants (`supabase/cron.sql`). À vérifier avant.

### 7. Leaked password protection
- Activer HIBP via `configure_auth` (1 appel)

---

### Ordre d'exécution proposé

1. **Quick wins** (faible risque) : #7 HIBP, #2 verify_jwt, #5 realtime RLS
2. **Refactor email** : #3 EmailJS → Resend (créer edge function invitations)
3. **Buckets privés** : #1 (le plus impactant — touche emails, PDF preview, attachments)
4. **TOTP** : #4 (prépare infra chiffrée)
5. **Extensions** : #6 en dernier (à valider avec cron.sql)

### Points à confirmer avant de coder

1. **Resend** est-il déjà configuré (`RESEND_API_KEY`) ? Sinon je dois te demander la clé pour migrer EmailJS.
2. **Signed URLs documents** : 7 jours OK pour les liens email clients ? (ou tu préfères 30/90 jours ?) Au-delà de 7j Supabase recommande de regénérer.
3. **TOTP** : on prépare l'infra (vue + RPC vides) ou on l'implémente vraiment (UI 2FA) ? Je propose : juste l'infra sécurisée, l'UI 2FA viendra séparément.
4. **Extensions** : OK pour déplacer même si ça demande de tester `cron.sql` ?

Confirme ces 4 points et je lance l'implémentation.
