# Factura - Application de gestion commerciale et comptable

Application web complète de gestion de facturation, devis, clients, comptabilité et rapprochement bancaire pour TPE/PME françaises.

## Technologies utilisées

- **Frontend** : React 18 + TypeScript + Vite
- **UI** : Tailwind CSS + shadcn/ui (composants Radix)
- **Backend** : Supabase (PostgreSQL + Auth + Storage + RLS)
- **PDF** : jsPDF + jsPDF-AutoTable
- **OCR** : Tesseract.js (client-side)
- **Email** : EmailJS
- **Charts** : Recharts

## Fonctionnalités

### Tableau de bord

- KPIs en temps réel : CA du mois, factures en attente, trésorerie, résultat
- Graphiques : Évolution CA (12 mois), factures impayées, répartition par statut
- Top clients par chiffre d'affaires
- Activité récente (factures/devis)
- Mises à jour en temps réel (Supabase Realtime)

### Gestion des Clients

- CRUD complet des contacts (clients/fournisseurs)
- Adresses de facturation et livraison séparées
- Numéro SIRET, TVA intracommunautaire
- Tags et notes personnalisées
- Conditions de paiement par défaut par client

### Articles/Catalogue

- Produits et services avec prix unitaire
- Association de taux de TVA
- Catégories et références
- État actif/inactif

### Devis

- Création avec lignes multiples (quantité, prix, TVA, remise)
- Statuts : brouillon, envoyé, consulté, accepté, refusé, expiré
- Conversion automatique en facture
- Génération PDF professionnelle
- Envoi par email (EmailJS ou Zoho Mail fallback)

### Factures

- Création manuelle ou depuis un devis
- Statuts : brouillon, envoyé, consulté, partiellement payé, payé, en retard, annulé
- Numérotation automatique séquentielle
- Suivi des paiements (montant payé, solde restant)
- Génération PDF avec logo, coordonnées bancaires, mentions légales
- Envoi par email
- Écritures comptables automatiques à l'envoi

### Achats / Factures fournisseurs

- Gestion des factures reçues
- Suivi des statuts et paiements
- Liaison avec les transactions bancaires

### Dépenses

- Saisie manuelle avec catégories prédéfinies
- Upload de justificatifs (photos/PDF)
- OCR avec Tesseract.js pour extraction automatique (montant, date, commerce)
- Catégories : restauration, transport, fournitures, télécom, abonnements, frais bancaires, hébergement, marketing, formation, autre
- Gestion des frais remboursables
- Liaison avec transactions bancaires

### Banque

- Gestion de comptes bancaires multiples
- Import OFX de relevés bancaires
- Détection de doublons via FITID (identifiant unique bancaire)
- Rapprochement bancaire avec factures et achats
- Mise à jour automatique des statuts de paiement lors du rapprochement

### Comptabilité

- Plan Comptable Général (PCG français) complet
- Écritures comptables automatiques (ventes, paiements) et manuelles
- Journaux : ventes, achats, banque, opérations diverses
- Grand livre par compte
- Balance générale
- KPIs comptables : TVA collectée/déductible, encaissements/décaissements, résultat

### Rapports

- Bilan comptable
- Compte de résultat
- Déclaration TVA par période
- Export FEC (Fichier des Écritures Comptables) conforme pour l'administration fiscale

### Paramètres

- Informations entreprise (nom, adresse, SIRET, TVA intracommunautaire)
- Upload du logo (affiché sur PDF)
- Coordonnées bancaires (IBAN, BIC)
- Préfixes de numérotation personnalisables
- Taux de TVA personnalisés
- Mentions légales
- Conditions de paiement par défaut

## Limitations connues

### Fonctionnalités non implémentées

- Gestion des stocks et inventaire
- Relances automatiques pour factures impayées
- Gestion des acomptes sur devis/factures
- Factures récurrentes (abonnements)
- Multi-devises (affichage EUR uniquement)
- Workflows d'approbation multi-niveaux
- Gestion d'équipe avancée (rôles non exploités dans l'UI)
- Time tracking pour facturation horaire
- Synchronisation bancaire automatique (import manuel OFX uniquement)
- Paiement en ligne (Stripe/PayPal)

### Limitations techniques

- OCR client-side : Tesseract.js est plus lent (~5-15s) qu'une API cloud
- Pas d'API REST externe pour intégrations tierces
- Pas de webhooks
- Bundle size important (~2MB, warning Vite > 500KB)
- EmailJS : 200 emails/mois gratuit
- Pas de mode offline
- 2FA : champs présents mais non implémentés

### Limitations comptables

- Pas de clôture d'exercice automatique
- Pas de lettrage des écritures client/fournisseur
- Pas de gestion des amortissements
- Rapprochement bancaire basique (montant exact requis)

### UX/UI

- Pas de mode sombre
- Responsive partiel (optimisé mobile, moins tablettes)
- Pas de raccourcis clavier
- Export Excel non disponible (PDF et FEC uniquement)

## Installation

```sh
# Cloner le repository
git clone <YOUR_GIT_URL>

# Naviguer dans le dossier
cd <YOUR_PROJECT_NAME>

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

## Scripts disponibles

| Commande            | Description                                   |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Lance le serveur de développement (port 8080) |
| `npm run build`     | Build de production                           |
| `npm run build:dev` | Build en mode développement                   |
| `npm run preview`   | Preview du build de production                |
| `npm run lint`      | Vérification du code avec ESLint              |

## Structure du projet

```
src/
├── components/           # Composants React réutilisables
│   ├── accounting/       # Comptabilité (plan comptable, grand livre)
│   ├── articles/         # Gestion du catalogue
│   ├── bank/             # Module bancaire
│   ├── bills/            # Factures fournisseurs
│   ├── clients/          # Gestion des contacts
│   ├── email/            # Envoi d'emails
│   ├── expenses/         # Dépenses et OCR
│   ├── invoices/         # Factures clients
│   ├── layout/           # Layout principal (sidebar, header)
│   ├── pdf/              # Preview PDF
│   ├── quotes/           # Devis
│   ├── reports/          # Rapports financiers
│   ├── settings/         # Paramètres
│   └── ui/               # Composants shadcn/ui
├── hooks/                # Custom hooks React (CRUD, queries)
├── integrations/         # Configuration Supabase
│   └── supabase/
│       ├── client.ts     # Client Supabase
│       └── types.ts      # Types générés
├── lib/                  # Utilitaires
│   ├── bankImportParser.ts   # Parsing OFX
│   ├── ocrParser.ts          # OCR Tesseract.js
│   ├── pdfGenerator.ts       # Génération PDF
│   └── utils.ts              # Helpers
├── pages/                # Pages de l'application
└── types/                # Types TypeScript additionnels
```

## Configuration

Créez un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# EmailJS (optionnel)
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

## Base de données

L'application utilise Supabase avec les tables principales :

- `organizations` : Entreprises
- `profiles` : Utilisateurs
- `contacts` : Clients et fournisseurs
- `articles` : Catalogue produits/services
- `quotes` / `quote_lines` : Devis
- `invoices` / `invoice_lines` : Factures clients
- `bills` / `bill_lines` : Factures fournisseurs
- `payments` / `bill_payments` : Paiements
- `expenses` : Dépenses
- `bank_accounts` / `bank_transactions` : Comptes et transactions bancaires
- `chart_of_accounts` : Plan comptable
- `journal_entries` / `journal_entry_lines` : Écritures comptables
- `tax_rates` : Taux de TVA
- `fiscal_years` : Exercices fiscaux

## Déploiement

L'application peut être déployée sur :

- Vercel
- Netlify
- GitHub Pages
- Tout hébergeur supportant les applications statiques

## Licence

Projet privé - Tous droits réservés
