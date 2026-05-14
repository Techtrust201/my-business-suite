# ADR 0001 — Stockage et flux 2FA / TOTP

- Statut : Acceptee
- Date : 2026-05-14
- Decideurs : equipe produit

## Contexte

Le schema actuel (`public.profiles`) contient les colonnes :

- `totp_secret TEXT` (nullable)
- `totp_enabled BOOLEAN` (default false)

Ces colonnes ne sont pas exploitees par l'application : aucun flux d'enrollement, aucune verification a la connexion, aucune lecture cote client. La fonctionnalite 2FA est documentee comme "a venir" dans le `README.md`.

L'audit de securite (mai 2026) a remonte que stocker un secret TOTP en clair en base est une faute si la table est jamais exposee — par une RLS trop permissive, un dump leak, ou une fuite d'application. Aujourd'hui, le risque est nul car la valeur est nulle pour toutes les lignes, mais cela ne doit pas le rester au moment de l'implementation.

## Decision

Quand le 2FA TOTP sera implemente, le projet adoptera les regles suivantes, **sans exception**.

1. **Chiffrement au repos** via `pgsodium` :
   - colonne stockee comme `bytea` chiffree, jamais en clair
   - clef principale gardee dans Supabase Vault (`vault.secrets`)
   - rotation des clefs documentee operationnellement

2. **Aucun acces client a `profiles.totp_secret`** :
   - RLS `SELECT` doit explicitement masquer la colonne, ou la table doit etre derriere une vue `profiles_safe` exposant un sous-ensemble sans `totp_secret`
   - le client lit `profiles_safe`, jamais `profiles` directement
   - une grant `REVOKE SELECT (totp_secret) ON profiles FROM authenticated, anon` est posee en complement

3. **Enrollement et verification via RPC `SECURITY DEFINER`** uniquement :
   - `enroll_totp()` : genere le secret, le chiffre, le stocke, et renvoie le QR code (uri otpauth) — jamais le secret en clair stocke
   - `verify_totp(code text)` : compare le code TOTP en deroulant le HMAC cote serveur
   - les fonctions ont `SET search_path = public, pg_temp` et `REVOKE EXECUTE FROM PUBLIC`

4. **Backup codes hashes** :
   - generes en clair une seule fois a l'enrollement (rendus a l'utilisateur, jamais relus)
   - stockes en base sous forme hashee (argon2id ou bcrypt cost >= 12)
   - effaces a la verification (single-use)

5. **Audit** :
   - chaque enrollement, desactivation, et tentative de verification (succes ou echec) est tracee dans `audit_logs` via la service_role
   - alerting sur > N echecs / fenetre glissante

## Consequences

- **Couts** : `pgsodium` ajoute un peu de latence aux operations sur les colonnes chiffrees. Negligeable pour un secret TOTP lu rarement.
- **Migration** : si des secrets en clair existent au moment de l'implementation (ne devrait pas, mais le defensif coute peu), une migration one-shot chiffre les valeurs existantes puis revoque les acces.
- **Recuperation** : pas de plan de recuperation cote serveur — perte du device = utilisation des backup codes ou flux de reset par admin (qui logguent dans `audit_logs`).

## Alternatives rejetees

- **Stocker en clair sous RLS stricte** : insuffisant. Une RLS oubliee ou un dump compromet tout.
- **Stocker hash uniquement** : impossible, TOTP necessite le secret original pour calculer le code.
- **Externaliser a un service tiers (Authy, Twilio)** : ajoute une dependance lourde et un cout recurrent ; on prefere garder la maitrise.

## References

- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [pgsodium](https://github.com/michelp/pgsodium)
- RFC 6238 — TOTP

## Liens

- Audit securite mai 2026 — point #4 du scan, et N7 du plan de remediation
- Tache : implementer ce design quand la feature 2FA sortira de la roadmap
