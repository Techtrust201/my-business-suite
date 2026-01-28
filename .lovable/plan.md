

# Plan : Afficher la marge dans la liste des devis

## Analyse de risque

Le bug precedent etait cause par des requetes demandant des colonnes **directement sur `quote_lines`** qui n'existent pas :
- `quote_lines.purchase_price` → n'existe pas → erreur 400
- `quote_lines.discount_amount` → n'existe pas → erreur 400

Ma solution est **differente et safe** car :
1. Elle utilise une **relation Supabase** : `article:articles(purchase_price)`
2. Cette relation joint via `item_id` vers la table `articles` où `purchase_price` **existe bien**
3. **C'est deja utilise** dans `useQuote()` (ligne 112-115) pour la page details et ca fonctionne

## Schema de la solution

```text
quote_lines                    articles
+-----------+                  +----------------+
| item_id   |  ───JOIN───────▶ | id             |
|           |                  | purchase_price | ✓ EXISTE
+-----------+                  +----------------+
```

## Modifications

### 1. src/hooks/useQuotes.tsx (ligne 79-83)

Ajouter la relation `article:articles(purchase_price)` comme dans `useQuote()` :

```typescript
// Avant
quote_lines(id, quantity, unit_price, discount_percent, line_type)

// Apres  
quote_lines(id, quantity, unit_price, discount_percent, line_type, item_id, article:articles(purchase_price))
```

### 2. src/components/quotes/QuotesTable.tsx (fonction getQuoteMargin)

Adapter le calcul pour extraire `purchase_price` depuis la relation `article` :

```typescript
const getQuoteMargin = (quote: any) => {
  if (!quote.quote_lines || quote.quote_lines.length === 0) return null;
  
  // Aplatir le purchase_price depuis article vers la ligne
  const lines = quote.quote_lines.map((line: any) => ({
    ...line,
    purchase_price: line.article?.purchase_price ?? null,
  })) as QuoteLineWithCost[];
  
  const margins = calculateMargins(lines);
  if (margins.totalMargin === 0 && margins.lines.length === 0) return null;
  return margins;
};
```

## Impact

- La colonne "Marge" affichera 112,00 € pour le chocolat (132€ - 20€)
- Aucune colonne inexistante n'est demandee
- Aucune modification de la base de donnees requise
- Le code reutilise exactement le pattern qui fonctionne deja dans `useQuote()`

