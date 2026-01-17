# Assets Wisherr - Instructions

## Fichiers image requis

Pour que l'application fonctionne correctement, vous devez ajouter les fichiers image suivants dans le dossier `frontend/public/` :

### 1. favicon.png
**Fichier source :** Icône du cadeau rose (celle fournie par l'utilisateur)
**Chemin :** `frontend/public/favicon.png`
**Format recommandé :** PNG, 192x192px ou 512x512px
**Description :** Favicon principal du site, affiché dans l'onglet du navigateur

### 2. wisherr-banner.png
**Fichier source :** Bannière avec le logo et le texte "Wisherr" stylisé
**Chemin :** `frontend/public/wisherr-banner.png`
**Format recommandé :** PNG avec fond transparent
**Dimensions recommandées :** Largeur environ 600-800px, hauteur 150-200px (ratio environ 4:1)
**Description :** Bannière utilisée dans :
- En haut de la sidebar
- Page de connexion (Login)
- Page d'inscription (Register)

## Comment ajouter les fichiers

1. Sauvegarder les images fournies par l'utilisateur
2. Les renommer selon les noms ci-dessus
3. Les placer dans `frontend/public/`
4. Supprimer les fichiers placeholder :
   ```bash
   rm frontend/public/favicon-placeholder.txt
   rm frontend/public/wisherr-banner-placeholder.txt
   ```

## Références mises à jour

Les fichiers suivants ont été modifiés pour utiliser les nouvelles images :

- `frontend/public/index.html` - Référence à favicon.png
- `frontend/public/manifest.json` - Icône de l'application PWA
- `frontend/src/shared/components/Sidebar.tsx` - Bannière en haut
- `frontend/src/features/auth/pages/Login.tsx` - Bannière sur la page de connexion
- `frontend/src/features/auth/pages/Register.tsx` - Bannière sur la page d'inscription

## Composant créé

Un nouveau composant réutilisable a été créé :
- `frontend/src/shared/components/WisherrBanner.tsx`

Ce composant gère l'affichage de la bannière avec différentes tailles (sm, md, lg).

## Après ajout des fichiers

Une fois les fichiers image ajoutés :
1. Rebuild l'image Docker frontend :
   ```bash
   cd frontend
   docker build -t adenyr/wisherr-frontend:latest -f Dockerfile.prod .
   docker push adenyr/wisherr-frontend:latest
   ```

2. Ou en développement, simplement redémarrer le serveur React.
