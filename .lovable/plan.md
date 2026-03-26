
## Problème
L'interface ne guide pas l'utilisateur dans l'ordre naturel des actions : envoyer d'abord, encaisser ensuite. Le bouton "+ Versement" est aussi visible que "Envoyer", ce qui prête à confusion.

## Solution : Réorganiser l'ordre visuel des boutons et ajouter une indication contextuelle

### 1. Ordre des boutons dans le header

Actuellement : `[+ Versement] [Envoyer] [Aperçu PDF] [Imprimer] [Modifier]`

Après : `[Envoyer] [Aperçu PDF] [Imprimer] [Modifier] [+ Versement]`

- "Envoyer" devient le **premier bouton** (action principale)
- "+ Versement" passe en **dernier** (action secondaire, après réception du paiement)

### 2. Texte du bouton Versement plus explicite

Changer `+ Versement` en `Enregistrer un paiement reçu` (ou juste `Paiement reçu`) pour que ce soit clair que c'est pour CONFIRMER un virement déjà reçu.

### 3. Pré-remplir le montant avec le solde restant

Quand le formulaire versement s'ouvre, pré-remplir `paymentAmount` avec `balanceDue` automatiquement (au lieu d'un champ vide avec placeholder).

Actuellement :
```typescript
const [paymentAmount, setPaymentAmount] = useState("");
```

Après : quand `showPaymentInput` passe à `true`, setter `paymentAmount` avec `balanceDue.toString()`.

### 4. Tooltip sur le bouton Versement

Ajouter un tooltip : "Cliquez ici une fois que vous avez reçu le paiement du client"

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/components/invoices/InvoiceDetails.tsx` | Réorganisation boutons, pré-remplissage montant, tooltip |
