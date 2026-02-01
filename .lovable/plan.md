
# Plan : Correction des bugs de la carte de prospection

## Problèmes identifiés

### 1. Dézoom automatique au clic
**Cause** : Le `useEffect` qui recrée les markers (ligne 169-261) a `selectedProspectId` dans ses dépendances. Quand on clique un marker :
1. `onProspectClick` change `selectedProspectId`
2. Cela déclenche la recréation de TOUS les markers
3. `fitBounds()` est appelé à la fin, ce qui recentre la carte sur tous les prospects

**Solution** : Séparer la logique :
- Retirer `selectedProspectId` des dépendances du useEffect principal
- Mettre à jour uniquement l'icône du marker sélectionné sans tout reconstruire

### 2. Points superposés invisibles
**Cause** : Quand plusieurs prospects ont exactement les mêmes coordonnées GPS, ils s'empilent. Le spiderfy ne fonctionne que quand les markers sont encore dans un cluster.

**Solution** : Détecter les groupes de markers au même emplacement et afficher un mini-cluster local avec un dialogue de sélection (comme pour les vrais clusters).

## Modifications

### src/components/crm/ProspectMap.tsx

#### 1. Retirer `selectedProspectId` des dépendances du useEffect principal

Le useEffect de création des markers ne doit plus dépendre de `selectedProspectId` pour éviter le fitBounds intempestif.

#### 2. Ajouter un useEffect séparé pour gérer la sélection

```typescript
// Mettre à jour uniquement l'icône quand la sélection change (sans recréer tous les markers)
useEffect(() => {
  markersRef.current.forEach((marker, prospectId) => {
    const prospect = geolocatedProspects.find(p => p.id === prospectId);
    if (!prospect) return;
    
    const color = prospect.status?.color || '#6B7280';
    const isSelected = prospectId === selectedProspectId;
    const icon = isSelected ? createSelectedIcon(color) : createColoredIcon(color);
    marker.setIcon(icon);
  });
}, [selectedProspectId, geolocatedProspects]);
```

#### 3. Détecter et gérer les points superposés

Ajouter une logique pour regrouper les prospects par coordonnées identiques :

```typescript
// Grouper les prospects par position (arrondie à 5 décimales pour tolérance)
const groupedByPosition = useMemo(() => {
  const groups = new Map<string, ProspectWithStatus[]>();
  geolocatedProspects.forEach(p => {
    const key = `${p.latitude!.toFixed(5)},${p.longitude!.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });
  return groups;
}, [geolocatedProspects]);
```

#### 4. Afficher un indicateur sur les points superposés

Pour les positions avec plusieurs prospects, afficher un badge "+N" sur le marker et ouvrir le dialogue de sélection au clic (réutiliser le même dialogue que les clusters).

## Résumé des changements

| Fichier | Modification |
|---------|--------------|
| ProspectMap.tsx | Séparer la gestion de la sélection du useEffect principal |
| ProspectMap.tsx | Ajouter la détection des points superposés |
| ProspectMap.tsx | Afficher un badge sur les points groupés |
| ProspectMap.tsx | Réutiliser le dialogue cluster pour les points superposés |

## Comportement après correction

1. **Clic sur un marker unique** : Centre la carte sur ce point, ouvre le popup, pas de dézoom
2. **Clic sur un marker groupé (points superposés)** : Ouvre le dialogue avec la liste des entreprises à cet emplacement
3. **Clic sur un cluster (+N)** : Comportement inchangé, ouvre le dialogue de sélection
