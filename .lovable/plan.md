

# Plan : Corriger les incohérences et erreurs esthétiques du PDF facture

## Problèmes identifiés

### 1. Accents manquants dans le PDF (échéancier)
Dans `pdfGenerator.ts`, tous les textes de l'échéancier sont sans accents :
- "Echeancier de paiement" → "Échéancier de paiement"
- "Echeance" → "Échéance"
- "Date prevue" → "Date prévue"
- "Paye" → "Payé"

### 2. Colonnes du tableau échéancier mal alignées
Les colonnes "Montant" et "Statut" utilisent des positions absolues (`pageWidth - 50` et `pageWidth - 25`) qui causent des chevauchements de texte, surtout quand le statut "Payé le 26/03/2026" est long.

### 3. Incohérence entre "Acompte reçu" dans les totaux et l'échéancier
Le bloc totaux affiche "Acompte reçu" avec le montant total payé, mais l'échéancier détaille chaque versement. Le terme "Acompte" est trompeur quand il y a eu plusieurs versements (acompte + mi-projet). Il faut utiliser "Montant réglé" à la place.

### 4. Le header "Article & Description" dans le tableau de lignes
Le header dit "Article & Description" mais le PDF dit aussi "Article & Description" — cohérent, mais dans le preview HTML le header dit aussi "Quantité" alors que le PDF dit "Qté". Incohérence entre les deux.

### 5. Quantité affichée avec 2 décimales inutiles dans le preview HTML
La quantité affiche "1,00" dans le preview HTML (via `minimumFractionDigits: 2`) alors que le PDF affiche "1". Il faut harmoniser.

## Solution

### Fichier : `src/lib/pdfGenerator.ts`

**Accents** : Remplacer tous les textes sans accents dans `addPaymentSchedule` :
- `"Echeancier de paiement"` → `"Échéancier de paiement"`
- `"Echeance"` → `"Échéance"`
- `"Date prevue"` → `"Date prévue"`
- `"Paye"` → `"Payé"`

**Alignement échéancier** : Utiliser `autoTable` au lieu du positionnement manuel pour le tableau échéancier, garantissant un alignement propre des colonnes.

**Totaux** : Remplacer "Acompte reçu" par "Montant réglé" (ligne ~775).

**Headers table lignes** : Harmoniser "Qté" → "Quantité" dans le PDF (ou l'inverse dans le preview, mais "Qté" est plus standard pour un PDF compact).

### Fichier : `src/components/invoices/InvoicePreview.tsx`

**Quantité** : Changer `minimumFractionDigits: 2` en `minimumFractionDigits: 0` pour la quantité (afficher "1" au lieu de "1,00").

**Header** : Garder "Quantité" dans le preview mais changer le PDF en "Quantité" aussi pour cohérence.

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/lib/pdfGenerator.ts` | Accents, alignement échéancier via autoTable, "Montant réglé", header "Quantité" |
| `src/components/invoices/InvoicePreview.tsx` | Format quantité sans décimales inutiles |

