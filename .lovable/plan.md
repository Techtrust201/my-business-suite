

# Plan : Corriger l'erreur "discount_amount" et les erreurs de build

## Probleme

1. **Erreur critique** : La creation de factures echoue avec "Could not find the 'discount_amount' column of 'invoice_lines' in the schema cache". Le code reference `discount_amount` dans les tables `invoice_lines` et `quote_lines`, mais cette colonne n'existe dans aucune des deux.

2. **Erreurs TypeScript** dans `SortableLineItem.tsx` : incompatibilite de types pour `DraggableAttributes` et `pointerEvents`.

## Modifications

### 1. Migration : Ajouter `discount_amount` aux tables

Ajouter la colonne `discount_amount` (numeric, nullable, default 0) a :
- `invoice_lines`
- `quote_lines`

```sql
ALTER TABLE public.invoice_lines ADD COLUMN discount_amount numeric DEFAULT 0;
ALTER TABLE public.quote_lines ADD COLUMN discount_amount numeric DEFAULT 0;
```

### 2. Corriger SortableLineItem.tsx

- Changer le type `DragHandleProps.attributes` de `Record<string, unknown>` vers le type reel `DraggableAttributes` importe de `@dnd-kit/core`
- Typer `pointerEvents` correctement avec `as const` ou un cast vers `CSSProperties`

### 3. Mettre a jour QuoteLineCard.tsx

Le composant `QuoteLineCard` utilise aussi `DragHandleProps` avec `Record<string, unknown>` -- aligner avec le nouveau type.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Ajout colonne `discount_amount` |
| `src/components/shared/SortableLineItem.tsx` | Fix types TS |
| `src/components/quotes/QuoteLineCard.tsx` | Aligner type DragHandleProps |

