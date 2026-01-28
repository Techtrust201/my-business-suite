
# Plan : Corriger les erreurs de colonnes manquantes dans les requêtes Supabase

## Statut : ✅ TERMINÉ

## Corrections appliquées

### 1. useQuotes.tsx - CORRIGÉ
Retiré `purchase_price` et `discount_amount` de la requête SELECT sur `quote_lines`.

### 2. useInvoices.tsx - CORRIGÉ
Retiré `discount_amount` de la requête SELECT sur `invoice_lines`.

### 3. Erreurs TypeScript - CORRIGÉES

| Fichier | Erreur | Correction |
|---------|--------|------------|
| `RemindersList.tsx` | `description` n'existe pas | Utilisé `notes` à la place |
| `AutoRemindersManager.tsx` | Type string vs enum | Casté vers `ReminderActionType` |
| `BankAccountsManager.tsx` | `notes` n'existe pas | Retiré cette propriété |
| `CommissionsManager.tsx` | Type string vs enum | Casté vers `CommissionRuleType` |
| `Commissions.tsx` | Arguments incorrects | Retiré l'argument de `useCommissionStats()` |
| `Commissions.tsx` | `commissionCount` n'existe pas | Utilisé `count` à la place |

## Impact

- ✅ Les devis sont de nouveau visibles
- ✅ Les factures sont de nouveau visibles  
- ✅ Les erreurs 400 ont disparu
- ✅ Le build TypeScript passe sans erreur
