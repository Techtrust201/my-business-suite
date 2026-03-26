

# Plan : Refonte complète du système paiements + échéancier

## Probleme

L'échéancier et les paiements sont deux systemes independants qui ne communiquent pas :
- Cliquer "Reçu" sur un echeancier enregistre un paiement SANS lien retour
- Supprimer un paiement ne demarque pas l'echeancier correspondant
- L'UI montre "tout reçu" meme si aucun argent n'est arrive
- Deux sections separees (historique + echeancier) creent de la confusion

## Solution : Un seul bloc unifie "Paiements"

### Architecture

```text
┌─ Paiements ─────────────────────────────────────────────┐
│  Total TTC : 12 000 €  ▓▓▓▓▓▓▓▓▓░░░░ 50% reçu         │
│  Reçu : 6 000 €   |   Reste : 6 000 €                  │
│                                                         │
│  Échéancier :                                           │
│  ✅ Acompte (50%)     6 000 €   01/01  [payé 01/01]     │
│  ⏳ Mi-projet (25%)   3 000 €   01/03  [Marquer reçu]   │
│  ⏳ Livraison (25%)   3 000 €   01/05                   │
│                                                         │
│  Versements sans échéancier :                           │
│  (versements manuels non liés à un échéancier)          │
│                                                         │
│  [+ Enregistrer un versement]  [Définir échéancier]     │
└─────────────────────────────────────────────────────────┘
```

### 1. Migration DB : lier schedule et payments

Ajouter `payment_id UUID` sur `invoice_payment_schedules` pour lier chaque echeance au paiement correspondant quand il est recu.

### 2. Refonte `useMarkScheduleItemPaid`

Quand on clique "Reçu" sur une echeance :
1. Enregistre le paiement en base (table `payments`)
2. Met a jour le schedule item avec `is_paid = true` ET `payment_id = <nouveau payment>`
3. Recalcule le statut de la facture

### 3. Refonte `useDeletePayment`

Quand on supprime un paiement :
1. Cherche s'il y a un schedule item avec ce `payment_id`
2. Si oui, remet `is_paid = false`, `paid_at = null`, `payment_id = null`
3. Recalcule le statut de la facture

### 4. Refonte UI dans `InvoiceDetails.tsx`

Fusionner les deux sections (historique + echeancier) en un seul bloc coherent :

**Barre de progression** en haut avec total / recu / reste

**Si echeancier defini** : afficher les lignes d'echeancier avec :
- Icone verte + date de paiement si payee
- Bouton "Marquer reçu" si en attente (ouvre le formulaire pre-rempli avec montant + methode + date)
- Bouton supprimer le paiement (avec confirmation) si deja payee

**Versements hors echeancier** : liste des paiements non lies a un echeancier (pour les paiements manuels libres)

**Si pas d'echeancier** : afficher simplement la liste des paiements comme avant

**Boutons en bas** :
- "Enregistrer un versement" (toujours visible tant que pas 100% paye)
- "Definir echeancier" (ouvre l'editeur de tranches)

### 5. Formulaire "Marquer reçu" sur echeance

Au lieu d'enregistrer directement, ouvrir un mini formulaire inline avec :
- Montant pre-rempli (montant de l'echeance)
- Methode (virement par defaut)
- Date (date du jour par defaut)
- Bouton confirmer

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Ajout colonne `payment_id` sur `invoice_payment_schedules` |
| `src/hooks/useInvoices.tsx` | Refonte `useMarkScheduleItemPaid`, `useDeletePayment` pour sync bidirectionnelle |
| `src/components/invoices/InvoiceDetails.tsx` | Fusion des sections paiement en un bloc unique et coherent |

