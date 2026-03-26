
# Plan : Paiements multi-tranches sur les factures

## Problème actuel

- Le bouton "Paiement" ajoute un montant et accumule dans `amount_paid`
- "Annuler paiement" remet tout à zéro d'un seul coup → impossible d'annuler juste un versement
- Aucun historique des versements visible dans l'interface
- La table `payments` existe déjà en base avec chaque versement individuel, mais elle n'est pas utilisée dans l'UI

## Objectif

Permettre :
1. D'enregistrer N versements (50% + 25% + 25% par exemple)
2. De voir l'historique des versements avec date et montant
3. D'annuler un versement précis (pas tous)
4. De voir clairement : Total TTC / Déjà payé / Reste à payer

## Modifications

### 1. Nouveau hook `useInvoicePayments` dans `useInvoices.tsx`

Requête des paiements d'une facture :
```typescript
useQuery(['payments', invoiceId], async () => {
  return supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('date')
})
```

Nouveau hook `useDeletePayment` pour annuler un versement précis :
- Supprime le paiement en base
- Recalcule `amount_paid` = somme des paiements restants
- Met à jour le statut (`paid`, `partially_paid`, `sent`)

### 2. Refonte de la section paiement dans `InvoiceDetails.tsx`

**Remplacer** le bloc actuel (simple input + "Annuler paiement" global) par :

```text
┌─ Paiements ──────────────────────────────────────────────┐
│  Total TTC : 12 000,00 €                                 │
│  Reçu      : 9 000,00 €  (75%)                           │
│  Restant   : 3 000,00 €                                  │
│                                                          │
│  Historique :                                            │
│  ✓ 12/01/2026  6 000,00 €  Virement  [Annuler]          │
│  ✓ 15/02/2026  3 000,00 €  Virement  [Annuler]          │
│                                                          │
│  [+ Enregistrer un versement]                            │
│    Montant : [____] Méthode : [▼] Date : [____]         │
│    [Enregistrer]                                         │
└──────────────────────────────────────────────────────────┘
```

- Bouton "Enregistrer un versement" reste visible même si partiellement payé
- Chaque ligne de paiement a son propre bouton "Annuler" (avec confirmation)
- Le bouton global "Annuler paiement" est supprimé
- Affichage d'une barre de progression (%) si paiement partiel

### 3. Ajout du champ méthode de paiement dans le formulaire de versement

Le formulaire de versement inclut :
- Montant (pré-rempli avec le solde restant)
- Méthode (`virement`, `carte`, `chèque`, `espèces`, `autre`)
- Date (par défaut aujourd'hui)

### 4. Correction de `useCancelInvoicePayment`

Renommer en `useDeletePayment(paymentId)` :
- Supprime le paiement par son ID
- Recalcule le solde restant en interrogeant tous les paiements restants
- Met à jour `amount_paid` et `status` correctement

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useInvoices.tsx` | Ajout `useInvoicePayments`, `useDeletePayment`, mise à jour `useRecordPayment` |
| `src/components/invoices/InvoiceDetails.tsx` | Refonte bloc paiement : historique + multi-tranches |

## Aucune migration DB requise

La table `payments` existe déjà avec : `id`, `invoice_id`, `amount`, `date`, `method`, `reference`, `notes`.
