# Utilisation

## Premiers pas

1. **Créer un compte**
   - Accédez à http://localhost:8080/register
   - Remplissez le formulaire (username, email, password)
   - Le mot de passe doit respecter: 8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
   - Validez et connectez-vous

2. **Se connecter**
   - Accédez à http://localhost:8080/login
   - Entrez vos identifiants (username ou email + password)
   - Le token JWT est stocké automatiquement et utilisé pour toutes les requêtes

3. **Créer votre première liste**
   - Cliquez sur "Mes listes" dans le menu
   - Cliquez sur "Créer une liste"
   - Remplissez: titre, description, image (optionnelle)
   - Définissez la visibilité (privée ou publique)
   - Enregistrez

4. **Ajouter des articles**
   - Ouvrez votre liste
   - Cliquez sur "Ajouter un article"
   - Remplissez les informations:
     - Nom (obligatoire)
     - URL (obligatoire) - Le scraping automatique récupérera titre, image, description, prix
     - Description, prix, image (automatique)
   - Enregistrez

5. **Partager votre liste**
   - **Partage interne** (utilisateur de la plateforme):
     - Ouvrez la liste → Onglet "Partage"
     - Entrez le username de l'utilisateur
     - Choisissez la permission (viewer ou editor)
     - Envoyez l'invitation
   - **Partage externe** (lien public):
     - Activez le partage externe
     - Définissez un mot de passe
     - Définissez une date d'expiration (optionnel)
     - Copiez le lien et partagez-le

6. **Réserver un article**
   - Accédez à une liste partagée avec vous
   - Cliquez sur un article → "Réserver"
   - Entrez votre nom (si anonyme) ou utilisez votre compte
   - L'article devient "réservé"

## Guide par rôle

### Propriétaire de liste (owner)
- ✅ Créer/modifier/supprimer la liste
- ✅ Ajouter/modifier/supprimer des articles
- ✅ Partager la liste (interne/externe)
- ✅ Gérer les collaborateurs (ajouter/retirer/changer permissions)
- ✅ Transférer la propriété à un autre utilisateur
- ✅ Voir l'audit log (qui a fait quoi et quand)
- ❌ Voir les réservations (par défaut, peut être modifié)

### Éditeur (editor)
- ✅ Voir la liste et tous les articles
- ✅ Ajouter/modifier des articles
- ✅ Réserver des articles (s'il a accès viewer sur d'autres listes)
- ❌ Supprimer la liste
- ❌ Gérer les collaborateurs
- ✅ Voir les réservations

### Viewer (viewer)
- ✅ Voir la liste et tous les articles
- ✅ Réserver des articles
- ❌ Modifier ou ajouter des articles
- ❌ Gérer la liste ou les collaborateurs

### Utilisateur externe (lien public)
- ✅ Voir la liste (si mot de passe correct)
- ✅ Réserver des articles (anonyme ou avec nom)
- ❌ Modifier quoi que ce soit

## Fonctionnalités avancées

### Groupes & Familles
1. **Créer un groupe**:
   - Menu "Groupes" → "Créer un groupe"
   - Nom, description, visibilité (public/privé)
   - Vous devenez admin du groupe

2. **Inviter des membres**:
   - Ouvrez le groupe → "Membres" → "Ajouter un membre"
   - Recherchez par username
   - Définissez le rôle (admin ou member)

3. **Partager une liste au groupe**:
   - Ouvrez votre liste → "Partage" → "Partager au groupe"
   - Sélectionnez le groupe
   - Tous les membres du groupe ont accès à la liste

### Notifications
- **Types de notifications**:
  - Réservation d'article (si notifications activées sur partage externe)
  - Invitation à collaborer sur une liste
  - Invitation à rejoindre un groupe
  - Achat d'article (marqué comme "acheté")
  - Modifications sur liste partagée (ajout/suppression article)

- **Gestion**:
  - Icône cloche 🔔 en haut à droite
  - Badge rouge si notifications non lues
  - Marquer comme lu/non-lu
  - Supprimer une ou toutes les notifications

### Fil d'activité
- **Accès**: Menu "Activités" ou dashboard
- **Contenu**: Actions récentes sur vos listes et listes partagées
  - Création/modification de listes
  - Ajout/modification d'articles
  - Réservations (visibles uniquement pour vous)
  - Invitations et partages
- **Filtres**: Par type d'action, par liste, par date

### Scraping automatique
Lors de l'ajout d'un article, si vous collez une URL (Amazon, FNAC, etc.), le backend:
1. Télécharge la page HTML
2. Extrait le titre (balise `<title>`, Open Graph `og:title`)
3. Extrait la description (meta description, `og:description`)
4. Extrait l'image principale (`og:image`, première image de la page)
5. Extrait le prix (patterns regex, balises prix e-commerce)
6. Pré-remplit les champs de l'article

**Commande manuelle**:
```bash
curl -X POST http://localhost:8000/scrape \
  -H "Authorization: Bearer <votre_token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.amazon.fr/product/..."}'
```

### Administration

#### Panel Admin
- **Accès**: Menu "Admin" (visible uniquement pour `is_admin=true`)

**Fonctionnalités**:
- **Dashboard**: Statistiques globales
  - Nombre d'utilisateurs (total, actifs aujourd'hui, cette semaine, ce mois)
  - Nombre de listes (total, publiques, privées)
  - Nombre d'articles (total, réservés, achetés)
  - Nombre de partages (internes, externes, actifs)
  - Taux de réservation, taux de conversion achat

- **Gestion utilisateurs**:
  - Liste de tous les utilisateurs
  - Recherche et filtres (par admin, par date d'inscription)
  - Créer un utilisateur manuellement
  - Modifier profil (email, username, locale)
  - Activer/désactiver droits admin
  - Soft delete (marque `deleted_at`, l'utilisateur ne peut plus se connecter)

- **Configuration système**:
  - Variables modifiables à chaud (stockées en DB):
    - `SITE_TITLE`: Titre du site
    - `ENABLE_LOCAL_AUTH`: Activer/désactiver auth locale
    - `ENABLE_OIDC_AUTH`: Activer/désactiver OIDC
    - `ALLOWED_ORIGINS`: CORS origins
  - Modification via API `/admin/config/{key}`
  - ⚠️ **Note** : `WISHERR_URL` (URL publique du site) est définie dans `.env` et utilisée pour générer les liens de partage. Elle doit être modifiée avant le déploiement (ex: `https://wisherr.example.com`).

- **Logs d'actions**:
  - Historique des actions sensibles (création/suppression utilisateur, toggle admin, modifications config)
  - Filtres par type d'action, par utilisateur, par date
  - Export (JSON)

- **Rapports d'erreurs**:
  - Collecte automatique des erreurs 500
  - Détails: message, stack trace, utilisateur, timestamp
  - Résolution manuelle (marquer comme résolu)
  - Suppression

- **Health system**:
  - Statut global (OK, WARNING, ERROR)
  - Statut DB (latence, connexion)
  - Statut Cache Redis (latence, connexion)
  - Statut externe (vérification endpoints configurés)
  - Uptime serveur
  - Version Python, nombre de routes