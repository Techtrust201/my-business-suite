## Cloner une facture

Ajouter une action "Dupliquer" dans le menu (⋯) de chaque ligne de la table des factures, qui crée une nouvelle facture brouillon reprenant toutes les infos de la facture source.

### Comportement
- Nouveau menu **Dupliquer** (icône Copy) placé entre **Modifier** et **Marquer payée**.
- Au clic :
  - Génère un nouveau numéro via `get_next_invoice_number` (donc FAC-00034 si la dernière est FAC-00033 → "facture +1").
  - Copie : `contact_id`, `subject`, `notes`, `terms`, `payment_method_text`, `bank_account_id`, totaux, lignes (avec leur `position`, `line_type`, remises, taxes, item_id).
  - Réinitialise : `status='draft'`, `date=aujourd'hui`, `due_date=null` (ou recalculée selon délai client), `amount_paid=0`, `paid_at=null`, échéancier vide, pas de PDF envoyé.
- Toast de succès + ouverture automatique de la nouvelle facture en mode édition pour modification immédiate.

### Détails techniques
- Nouveau hook `useDuplicateInvoice` dans `src/hooks/useInvoices.tsx` :
  1. `select *` de la facture + `invoice_lines` triées par position.
  2. RPC `get_next_invoice_number`.
  3. `insert` nouvelle facture (status draft, paid_at null, amount_paid 0).
  4. `insert` toutes les lignes avec le nouvel `invoice_id`.
  5. `invalidateQueries(['invoices'])` + navigate vers `/factures/{id}/edition`.
- Ajout de l'entrée dans le `DropdownMenu` de `src/components/invoices/InvoicesTable.tsx`.
- Aucune migration DB nécessaire.
- Pas d'écriture comptable au clone (statut brouillon).

### Hors scope
- Pas de duplication pour les devis (à demander séparément si besoin).
- Pas de duplication multiple/batch.
