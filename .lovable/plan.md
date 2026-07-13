Objectif : les PDF facture et devis doivent accepter les longs textes générés par IA sans caractères bizarres, sans chevauchement sous les colonnes Quantité / Prix / TVA, et sans police qui “bug”.

Plan :

1. Corriger la génération PDF commune factures + devis
- Centraliser un nettoyage texte plus robuste avant rendu PDF : espaces insécables, apostrophes/quotes typographiques, tirets, puces, caractères de contrôle, tabulations et espaces multiples.
- Forcer une police jsPDF stable partout dans les tableaux et zones texte.
- Garder les accents français, mais supprimer/remplacer les caractères invisibles ou exotiques qui cassent le rendu.

2. Réparer le tableau des lignes longues
- Augmenter la largeur utile de la colonne “Article & Description”.
- Réduire et stabiliser les colonnes secondaires pour éviter que le texte déborde dessous.
- Mettre les colonnes numériques en alignement à droite, avec largeur fixe.
- Activer un découpage propre des descriptions longues ligne par ligne dans la cellule, avec hauteur de ligne calculée par autoTable.
- Empêcher les ruptures de ligne au milieu d’une ligne d’article quand ça provoque un chevauchement illisible.

3. Ne plus tronquer les textes utiles
- Pour les lignes “texte libre” et sections, ne pas limiter arbitrairement à 3 lignes si le contenu est important.
- Ajouter une pagination propre quand les textes sont longs.
- Même logique appliquée à facture et devis, car les deux passent par `generateInvoicePDF` / `generateQuotePDF` dans `src/lib/pdfGenerator.ts`.

4. Ajouter une aide de rédaction intégrée, sans backend ni clé API
- Ajouter dans l’éditeur de lignes facture/devis un bouton d’aide type “Améliorer le texte” ou “Nettoyer pour PDF”.
- Il reformatera localement le texte collé depuis Cursor/IA : suppression caractères problématiques, retours à la ligne propres, listes mieux structurées.
- Ça évite de dépendre d’un copier-coller fragile, tout en restant modifiable à ta guise.

5. Vérification
- Créer un cas de test avec une description longue similaire à tes captures : accents, apostrophes, tirets, puces, texte multi-lignes.
- Vérifier facture + devis : aperçu PDF, téléchargement, pas de chevauchement sous Quantité / Prix unit. HT / TVA.
- Lancer une validation TypeScript ciblée pour éviter les bugs de compilation.