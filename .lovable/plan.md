# Plan : Correction des bugs de la carte de prospection

## ✅ IMPLÉMENTÉ

### Corrections appliquées

1. **Dézoom automatique corrigé** : `selectedProspectId` retiré des dépendances du useEffect principal. Un useEffect séparé gère maintenant la mise à jour des icônes sans recréer tous les markers.

2. **Points superposés visibles** : Détection des prospects aux mêmes coordonnées GPS avec affichage d'un badge "+N". Clic sur un marqueur groupé ouvre le dialogue de sélection.

3. **Icône de sélection** : L'icône du marker sélectionné est mise à jour indépendamment pour éviter le fitBounds intempestif.

### Comportement après correction

1. **Clic sur un marker unique** : Centre la carte sur ce point, ouvre le popup, pas de dézoom
2. **Clic sur un marker groupé (points superposés)** : Ouvre le dialogue avec la liste des entreprises à cet emplacement
3. **Clic sur un cluster (+N)** : Comportement inchangé, ouvre le dialogue de sélection
