# Factura - Application de gestion de facturation

Application web complète de gestion de facturation, devis, clients et comptabilité pour entreprises.

## Fonctionnalités

- **Gestion des clients** : Ajout, modification et suivi des clients
- **Devis** : Création et gestion des devis avec conversion en facture
- **Factures** : Génération de factures PDF professionnelles
- **Comptabilité** : Suivi des paiements et rapports financiers
- **Banque** : Import OFX et rapprochement bancaire automatique
- **Paramètres** : Personnalisation de l'entreprise et du logo

## Technologies utilisées

- **Frontend** : React 18 + TypeScript
- **UI** : Tailwind CSS + shadcn/ui
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **Build** : Vite
- **PDF** : jsPDF + jsPDF-AutoTable

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

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Build de production
- `npm run preview` - Preview du build de production
- `npm run lint` - Vérification du code avec ESLint

## Structure du projet

```
src/
├── components/     # Composants React réutilisables
├── hooks/          # Custom hooks React
├── integrations/   # Intégration Supabase
├── lib/            # Utilitaires et helpers
├── pages/          # Pages de l'application
└── types/          # Types TypeScript
```

## Déploiement

L'application peut être déployée sur n'importe quelle plateforme supportant les applications React/Vite :

- Vercel
- Netlify
- GitHub Pages
- Ou tout autre hébergeur statique

## Configuration

Créez un fichier `.env` à la racine avec vos variables d'environnement Supabase :

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
