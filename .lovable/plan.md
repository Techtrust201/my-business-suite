
# Plan : Corriger les erreurs de colonnes manquantes dans les requêtes Supabase

## Diagnostic

Les requêtes Supabase échouent avec des erreurs 400 car elles demandent des colonnes qui n'existent pas dans la base de données :

| Hook | Colonne demandée | Table | Existe? |
|------|------------------|-------|---------|
| `useQuotes` | `purchase_price` | `quote_lines` | Non |
| `useQuotes` | `discount_amount` | `quote_lines` | Non |
| `useInvoices` | `discount_amount` | `invoice_lines` | Non |

## Solution

Retirer les colonnes inexistantes des requêtes SELECT.

## Modifications a effectuer

### 1. src/hooks/useQuotes.tsx (ligne 79-83)

**Avant :**
```typescript
.select(`
  *,
  contact:contacts(id, company_name, first_name, last_name, email),
  quote_lines(id, purchase_price, quantity, unit_price, discount_percent, discount_amount, line_type)
`)
```

**Apres :**
```typescript
.select(`
  *,
  contact:contacts(id, company_name, first_name, last_name, email),
  quote_lines(id, quantity, unit_price, discount_percent, line_type)
`)
```

### 2. src/hooks/useInvoices.tsx (ligne 93-97)

**Avant :**
```typescript
.select(`
  *,
  contact:contacts(id, company_name, first_name, last_name, email),
  invoice_lines(id, purchase_price, quantity, unit_price, discount_percent, discount_amount, line_type)
`)
```

**Apres :**
```typescript
.select(`
  *,
  contact:contacts(id, company_name, first_name, last_name, email),
  invoice_lines(id, purchase_price, quantity, unit_price, discount_percent, line_type)
`)
```

### 3. Corriger les erreurs de build restantes

En parallele, corriger les 8 erreurs TypeScript signalees :

| Fichier | Erreur | Correction |
|---------|--------|------------|
| `RemindersList.tsx` | `description` n'existe pas | Utiliser `notes` a la place |
| `AutoRemindersManager.tsx` | Type string vs enum | Caster vers le type enum correct |
| `BankAccountsManager.tsx` | `notes` n'existe pas | Retirer cette propriete |
| `CommissionsManager.tsx` | Type string vs enum | Caster vers le type enum correct |
| `Commissions.tsx` | Arguments incorrects | Corriger l'appel de fonction |
| `Commissions.tsx` | `commissionCount` n'existe pas | Utiliser la propriete correcte |

## Impact

- Les devis et factures seront de nouveau visibles
- Les erreurs 400 disparaitront
- L'application fonctionnera correctement
