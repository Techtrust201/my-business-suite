## Objectif

Remplacer le comportement actuel de "Envoyer via Zoho" (qui ouvre juste l'onglet Zoho compose sans rien pré-remplir correctement et sans pièce jointe) par un **envoi 100% automatique via l'API Zoho Mail**, avec destinataire, sujet, corps et **PDF joint** — exactement comme "Envoyer".

## Ce qui change côté utilisateur

- Le bouton **"Envoyer via Zoho"** devient : "Envoyer depuis mon Zoho".
- Au premier usage : bouton **"Connecter mon compte Zoho Mail"** dans Paramètres → un clic, autorisation OAuth Zoho, retour dans l'app. Une seule fois.
- Ensuite, cliquer sur "Envoyer via Zoho" envoie directement l'email **depuis ton adresse Zoho** (`contact@tech-trust.fr`) avec le PDF en pièce jointe, sans ouvrir aucun onglet, sans copier-coller.
- Un aperçu final "À envoyer depuis contact@tech-trust.fr — [Confirmer / Annuler]" s'affiche avant l'envoi si tu veux vérifier.

## Architecture technique

### 1. OAuth Zoho Mail (une seule fois par organisation)

Zoho Mail n'existe pas comme connecteur Lovable standard → on implémente OAuth 2.0 nous-mêmes.

**Prérequis utilisateur** (une fois) :
- Créer une "Server-based Application" sur https://api-console.zoho.eu/
- Récupérer `Client ID` + `Client Secret`
- Ajouter le redirect URI qu'on lui donnera (une edge function)
- Scopes : `ZohoMail.messages.CREATE`, `ZohoMail.accounts.READ`, `ZohoMail.attachments.CREATE`

**Stockage** :
- `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET` → secrets Lovable Cloud (via `add_secret`)
- Nouvelle table `zoho_integrations` (par organisation) :
  - `organization_id`, `zoho_account_id`, `access_token`, `refresh_token`, `expires_at`, `email`, `created_by`
  - RLS : admins de l'organisation uniquement
  - GRANT approprié + `service_role` pour les edge functions

### 2. Edge Functions

- **`zoho-oauth-init`** : génère l'URL d'autorisation Zoho et redirige.
- **`zoho-oauth-callback`** : reçoit le code, échange contre access/refresh token, appelle `/accounts` pour récupérer `accountId`, stocke dans `zoho_integrations`.
- **`zoho-send-email`** : appelée depuis le front avec `{ documentId, documentType, recipient, subject, message, pdfBase64 }`.
  1. Récupère l'intégration Zoho de l'org, rafraîchit le token si expiré (`/oauth/v2/token` avec refresh_token).
  2. `POST /api/accounts/{accountId}/messages` avec `fromAddress`, `toAddress`, `subject`, `content`, et le PDF joint via l'endpoint d'upload de pièces jointes Zoho puis référencé dans le message.
  3. Retourne succès/erreur avec le détail Zoho.

### 3. Front-end

- **`src/pages/Parametres.tsx`** → nouvelle section "Intégration Zoho Mail" :
  - Si non connecté → bouton "Connecter Zoho" (ouvre `zoho-oauth-init`).
  - Si connecté → email affiché + bouton "Déconnecter".
- **`src/components/email/SendEmailModal.tsx`** :
  - Si l'org a une intégration Zoho active → le bouton "Envoyer via Zoho" appelle `zoho-send-email` (mêmes params que EmailJS : destinataire, sujet, message, PDF).
  - Si non → un tooltip explique qu'il faut connecter Zoho dans Paramètres (avec un lien direct).
  - On supprime l'ouverture d'onglet `mail.zoho.eu`.
- **`src/hooks/useZohoIntegration.tsx`** : hook pour lire/rafraîchir l'état de l'intégration.

### 4. Sécurité

- Tokens Zoho stockés uniquement côté serveur (edge function via service_role), jamais exposés au client.
- Endpoint `zoho-send-email` vérifie le JWT de l'utilisateur + son appartenance à l'organisation avant d'envoyer.
- Validation Zod des inputs (recipient email, taille du PDF).

## Étapes d'implémentation

1. Créer la table `zoho_integrations` + RLS + GRANT.
2. Demander à l'utilisateur `ZOHO_CLIENT_ID` et `ZOHO_CLIENT_SECRET` via `add_secret` (après lui avoir expliqué où les créer sur api-console.zoho.eu et quel redirect URI mettre).
3. Créer les 3 edge functions (`zoho-oauth-init`, `zoho-oauth-callback`, `zoho-send-email`).
4. Ajouter la section UI dans Paramètres + hook `useZohoIntegration`.
5. Modifier `SendEmailModal.tsx` : `handleSendManual` devient `handleSendViaZoho` qui appelle `zoho-send-email`.
6. Tester : connexion OAuth → envoi facture avec PDF → vérifier réception + apparition dans "Envoyés" de Zoho.

## À valider avant de coder

- Prérequis : je vais avoir besoin que tu crées une **application "Server-based" sur https://api-console.zoho.eu/** et que tu me donnes ensuite le `Client ID` + `Client Secret` (je te dirai précisément quoi mettre dans les champs, notamment le redirect URI). OK pour toi ?
