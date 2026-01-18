# API Documentation

## Endpoints principaux

### Authentification (`/auth`)
- `POST /auth/register` - Créer un compte
- `POST /auth/login` - Se connecter (JWT token)
- `POST /auth/logout` - Se déconnecter
- `GET /auth/me` - Profil utilisateur connecté
- `PUT /auth/profile` - Modifier son profil

### Listes de souhaits (`/wishlists`)
- `GET /wishlists/mine` - Mes listes
- `GET /wishlists/with-roles` - Listes avec mes permissions
- `GET /wishlists/{id}` - Détail d'une liste
- `POST /wishlists` - Créer une liste
- `PUT /wishlists/{id}` - Modifier une liste
- `DELETE /wishlists/{id}` - Supprimer une liste
- `GET /wishlists/{id}/collaborators` - Liste des collaborateurs
- `POST /wishlists/{id}/collaborators` - Ajouter un collaborateur
- `DELETE /wishlists/{id}/collaborators/{collab_id}` - Retirer un collaborateur
- `PUT /wishlists/{id}/collaborators/{collab_id}` - Modifier permissions collaborateur
- `GET /wishlists/{id}/audit` - Audit log de la liste
- `PUT /wishlists/{id}/transfer_owner` - Transférer la propriété
- `GET /wishlists/{id}/settings` - Récupérer paramètres liste
- `PUT /wishlists/{id}/settings` - Modifier paramètres liste

### Articles (`/items`)
- `GET /items/wishlist/{wishlist_id}` - Articles d'une liste
- `GET /items/{item_id}` - Détail d'un article
- `POST /items` - Créer un article
- `PUT /items/{item_id}` - Modifier un article
- `DELETE /items/{item_id}` - Supprimer un article
- `POST /items/{item_id}/reserve` - Réserver un article
- `POST /items/{item_id}/unreserve` - Annuler réservation
- `POST /items/{item_id}/purchase` - Marquer comme acheté
- `POST /items/reorder` - Réorganiser les articles
- `GET /items/categories/list` - Liste des catégories
- `POST /items/categories` - Créer une catégorie
- `DELETE /items/categories/{category_id}` - Supprimer une catégorie
- `GET /items/priorities/list` - Liste des priorités

### Partages (`/shares`)
- `GET /shares` - Mes partages
- `GET /shares/shared-with-me` - Listes partagées avec moi
- `POST /shares/internal` - Créer partage interne (utilisateur/groupe)
- `POST /shares/external` - Créer partage externe (lien public)
- `PUT /shares/{share_id}/password` - Modifier mot de passe partage externe
- `PUT /shares/{share_id}/notifications` - Activer/désactiver notifications
- `PUT /shares/{share_id}/toggle` - Activer/désactiver partage
- `DELETE /shares/{share_id}` - Supprimer partage
- `PUT /shares/{share_id}/permission` - Modifier permission partage
- `GET /shares/external/{token}` - Voir partage externe (avec mot de passe)
- `POST /shares/external/{token}/access` - Accéder à partage externe
- `POST /shares/external/{token}/reserve/{item_id}` - Réserver (utilisateur externe)
- `POST /shares/external/{token}/purchase/{item_id}` - Marquer acheté (utilisateur externe)

### Groupes (`/groups`)
- `GET /groups` - Mes groupes
- `GET /groups/{group_id}` - Détail d'un groupe
- `POST /groups` - Créer un groupe
- `PUT /groups/{group_id}` - Modifier un groupe
- `DELETE /groups/{group_id}` - Supprimer un groupe
- `POST /groups/{group_id}/members` - Ajouter un membre
- `DELETE /groups/{group_id}/members/{user_id}` - Retirer un membre
- `GET /groups/{group_id}/check-user/{username}` - Vérifier si utilisateur existe

### Notifications (`/notifications`)
- `GET /notifications` - Liste des notifications (paginées)
- `GET /notifications/count` - Nombre de notifications non lues
- `POST /notifications/mark-read` - Marquer notification(s) comme lue(s)
- `POST /notifications/mark-all-read` - Marquer toutes comme lues
- `DELETE /notifications/{notification_id}` - Supprimer une notification
- `DELETE /notifications` - Supprimer toutes les notifications

### Activités (`/activities`)
- `GET /activities/feed` - Fil d'activité complet (paginé)
- `GET /activities/recent` - Activités récentes (10 dernières)

### Scraping (`/scrape`)
- `POST /scrape` - Scraper une URL (titre, description, image, prix)

### Admin (`/admin`)
- `GET /admin/stats` - Statistiques globales
- `GET /admin/health` - Statut système complet
- `GET /admin/config` - Liste des variables de configuration
- `GET /admin/config/{key}` - Récupérer une variable
- `PUT /admin/config/{key}` - Modifier une variable
- `PUT /admin/config` - Modifier plusieurs variables
- `GET /admin/users` - Liste tous les utilisateurs
- `POST /admin/users` - Créer un utilisateur
- `PUT /admin/users/{user_id}` - Modifier un utilisateur
- `DELETE /admin/users/{user_id}` - Soft delete utilisateur
- `PUT /admin/users/{user_id}/toggle-admin` - Basculer droits admin
- `GET /admin/errors` - Liste des erreurs système
- `POST /admin/errors/{error_id}/resolve` - Marquer erreur comme résolue
- `DELETE /admin/errors/{error_id}` - Supprimer une erreur
- `POST /admin/report-error` - Signaler une erreur (frontend)
- `GET /admin/logs` - Logs d'actions admin
- `GET /admin/logs/actions` - Actions spécifiques (filtres)

### Public (`/public`)
- `GET /public/site-info` - Informations publiques du site (titre, locale, features)

### Monitoring
- `GET /api/health` - Health check (DB, cache, uptime, latence)
- `GET /metrics` - Métriques Prometheus

## Documentation interactive

Accédez à la documentation Swagger interactive : **http://localhost:8000/docs**

Features:
- Tester tous les endpoints directement depuis le navigateur
- Voir les schémas de requête/réponse
- Authentification JWT intégrée (bouton "Authorize")
- Examples de requêtes/réponses

Alternative ReDoc : **http://localhost:8000/redoc**