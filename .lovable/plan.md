

# Plan : Ajouter la suppression de prospects

## Analyse

Le hook `useDeleteProspect` existe deja dans le code (useProspects.tsx lignes 288-309) mais aucun bouton ne permet de l'utiliser dans l'interface.

## Modifications

### 1. ProspectsTable.tsx - Ajouter un bouton supprimer dans la vue liste

- Importer l'icone `Trash2` de lucide-react
- Ajouter un bouton supprimer a cote des boutons "Voir" et "Modifier"
- Ajouter une prop `onDelete` pour gerer la suppression
- Utiliser un AlertDialog pour confirmation avant suppression

### 2. CRM.tsx - Connecter la logique de suppression

- Importer `useDeleteProspect` depuis le hook
- Creer un handler `handleDeleteProspect` qui appelle la mutation
- Passer ce handler a `ProspectsTable`
- Fermer les details si le prospect supprime etait selectionne

### 3. ProspectDetails.tsx - Ajouter un bouton supprimer dans la vue details

- Ajouter un bouton "Supprimer" dans les actions rapides
- Utiliser un AlertDialog pour confirmation
- Fermer le sheet apres suppression reussie

## Structure du bouton

```text
[Voir] [Modifier] [Supprimer]
         ↓
    AlertDialog
"Etes-vous sur de vouloir supprimer ce prospect ?"
    [Annuler] [Supprimer]
```

## Securite

- La RLS sur la table `prospects` autorise deja DELETE pour les utilisateurs de l'organisation
- La permission `canManageProspects` sera verifiee avant d'afficher le bouton

