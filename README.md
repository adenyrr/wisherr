# 🎁 Wisherr - Gestionnaire de Listes de Souhaits

Une application web moderne et complète pour créer, gérer et partager vos listes de souhaits. Wisherr permet aux utilisateurs de créer des listes de cadeaux, de les partager avec leurs proches (famille, amis, groupes), et d'éviter les doublons grâce aux réservations privées.

## ✨ Fonctionnalités principales

### 🔐 Authentification & Sécurité
- **Authentification locale** (username/password) avec validation stricte
- **Authentification OIDC** (OAuth 2.0 / OpenID Connect) pour SSO
- **Rate limiting** : Protection contre force brute (5 req/min register, 10 req/min login)
- **Validation mots de passe** : Minimum 8 caractères, majuscule, minuscule, chiffre, caractère spécial
- **JWT sécurisé** avec refresh tokens et expiration configurable
- **CORS configuré** pour sécuriser les requêtes cross-origin

### 📝 Gestion de Listes de Souhaits
- **CRUD complet** : Créer, consulter, modifier, supprimer vos listes
- **Permissions granulaires** : owner, editor, viewer
- **Transfert de propriété** : Transférer une liste à un autre utilisateur
- **Audit logs** : Traçabilité complète des modifications

### 🎯 Articles (Items)
- **Informations détaillées** : Nom, description, URL, image, prix
- **Scraping automatique** : Extraction des métadonnées depuis une URL (titre, description, image, prix)
- **Catégories et priorités** : Classification et niveaux d'importance
- **Attributs personnalisés** : Champs JSON flexibles pour données spécifiques
- **Statuts** : available, reserved, purchased
- **Images** : Upload ou lien externe

### 🔒 Réservations & Achats
- **Réservations privées** : Réserver un article sans que le propriétaire le voie
- **Notification de réservation** : Alerter le propriétaire (optionnel)
- **Annulation de réservation** : Libérer un article réservé par erreur

### 👥 Partage & Collaboration
- **Partage interne** : Inviter des utilisateurs de la plateforme (par username)
- **Partage vers groupes** : Partager avec une famille ou un groupe d'amis
- **Partage externe** : Liens publics avec mot de passe pour utilisateurs externes
- **Permissions** : viewer (lecture seule) ou editor (peut modifier/ajouter articles)
- **Expiration de liens** : Liens de partage externes avec date d'expiration
- **Notifications** : Alertes en temps réel lors de réservations (optionnel)

### 🏘️ Groupes & Familles
- **Création de groupes** : Organiser vos proches en groupes (famille, amis, collègues)
- **Gestion de membres** : Ajouter/retirer des membres, gérer les rôles (admin/member)
- **Partage de listes au groupe** : Partager automatiquement vos listes avec tout le groupe
- **Vérification d'utilisateurs** : Rechercher un utilisateur avant de l'ajouter

### 🔔 Notifications & Activités
- **Notifications en temps réel** : Réservations, partages, invitations, achats
- **Fil d'activité** : Historique des actions sur vos listes et celles partagées
- **Filtres de notifications** : Gérer vos préférences de notification
- **Marquage lu/non-lu** : Gestion intuitive des notifications
- **Suppression** : Nettoyer les anciennes notifications

### 🌍 Internationalisation (i18n)
- **Support multilingue** : Français (FR), Anglais (EN)
- **Détection automatique** : Basée sur la langue du navigateur
- **Changement dynamique** : Switch langue sans recharger la page
- **Préférences utilisateur** : Langue enregistrée par profil

### 🎨 Interface Utilisateur
- **Thème moderne** : Glassmorphism, dégradés, animations fluides
- **Dark/Light mode** : Basculement automatique ou manuel
- **Responsive design** : Adapté mobile, tablette, desktop
- **Icônes Lucide React** : Cohérence visuelle et accessibilité
- **Police Inclusive Sans** : Lisibilité optimale pour tous
- **Animations** : Transitions, hover effects, loading states

### 📊 Monitoring & Observabilité
- **Métriques Prometheus** : `http_requests_total`, `http_request_latency_seconds`
- **Health check** : Endpoint `/api/health` avec statut DB, cache, uptime, latence
- **Metrics endpoint** : `/metrics` au format Prometheus
- **Logs structurés** : JSON logs pour parsing et analyse
- **Admin dashboard** : Statistiques globales (utilisateurs, listes, items, réservations)

### 🛡️ Administration
- **Panel admin** : Interface dédiée pour administrateurs
- **Gestion utilisateurs** : CRUD utilisateurs, toggle admin rights, soft delete
- **Configuration système** : Variables de configuration modifiables à chaud
- **Logs d'actions** : Traçabilité des actions sensibles
- **Rapports d'erreurs** : Collecte et résolution d'erreurs applicatives
- **Statistiques globales** : Vue d'ensemble du système (users, wishlists, items, reservations)

## 🏗️ Architecture

### Vue d'ensemble

```
wisherr/
├── backend/                # API FastAPI (Python 3.11)
│   ├── app/
│   │   ├── auth/          # Authentification & autorisation (JWT, OIDC)
│   │   ├── wishlists/     # CRUD listes, collaborateurs, settings
│   │   ├── items/         # CRUD articles, réservations, achats
│   │   ├── shares/        # Partage interne/externe, tokens
│   │   ├── groups/        # Groupes/familles, membres
│   │   ├── notifications/ # Notifications temps réel
│   │   ├── activities/    # Fil d'activité, logs d'audit
│   │   ├── admin/         # Panel admin, stats, config
│   │   ├── public/        # Endpoints publics (site info)
│   │   ├── scrape/        # Scraping métadonnées URL
│   │   ├── core/          # DB, cache, rate limiting, utils
│   │   └── tests/         # Tests unitaires pytest
│   ├── pyproject.toml     # Dépendances Poetry
│   └── Dockerfile         # Image backend production
├── frontend/              # React 19 + TypeScript
│   ├── src/
│   │   ├── features/      # Modules par fonctionnalité
│   │   │   ├── auth/      # Login, register, profil
│   │   │   ├── wishlists/ # Listes, création, édition
│   │   │   ├── items/     # Articles, réservations
│   │   │   ├── shares/    # Partage, permissions
│   │   │   ├── groups/    # Groupes, membres
│   │   │   ├── notifications/ # Notifications UI
│   │   │   ├── dashboard/ # Tableau de bord
│   │   │   └── admin/     # Admin UI
│   │   ├── shared/        # Composants partagés, utils, store
│   │   ├── routes/        # Routing React Router
│   │   └── index.css      # Thème Tailwind CSS
│   ├── package.json       # Dépendances npm
│   └── Dockerfile.prod    # Image frontend nginx
├── db/
│   ├── schema.sql         # Schéma PostgreSQL initial
│   ├── migrations/        # Migrations Alembic
│   └── data/              # Volume données PostgreSQL (gitignored)
├── .github/
│   └── workflows/         # CI/CD GitHub Actions
├── .gitlab-ci.yml         # CI/CD GitLab (lint, test, docker, deploy)
├── docker-compose.yml     # Orchestration services
└── .env.example           # Template variables d'environnement
```

### Stack Technique

#### Backend
- **Framework** : FastAPI 0.110+ (Python 3.11)
- **ORM** : SQLModel (type-safe, async support)
- **Base de données** : PostgreSQL 15
- **Cache** : Redis 5.0 (optionnel)
- **Auth** : python-jose (JWT), Authlib (OIDC)
- **Validation** : Pydantic 2.5 (email, data models)
- **Rate limiting** : SlowAPI
- **Scraping** : BeautifulSoup4, Requests
- **Monitoring** : prometheus-client 0.16.0
- **Tests** : pytest, httpx, pytest-asyncio

#### Frontend
- **Framework** : React 19 + TypeScript 4.9
- **Routing** : React Router DOM 7.12
- **State Management** : Zustand 5.0
- **UI Library** : Material-UI 7.3 (@mui/material)
- **Styling** : Tailwind CSS 3.4, @emotion/styled
- **Icônes** : Lucide React 0.562
- **i18n** : i18next 22.4, react-i18next
- **HTTP Client** : Axios 1.13
- **Build Tool** : Craco 7.1, React Scripts 5.0

#### DevOps & Infrastructure
- **Conteneurisation** : Docker, Docker Compose
- **CI/CD** : GitHub Actions, GitLab CI
- **Tests** : pytest (backend), Jest (frontend)
- **Linting** : Ruff (Python), ESLint (TypeScript)
- **Sécurité** : Bandit (SAST Python)

### Base de données

#### Tables principales
- **users** : Utilisateurs (id, username, email, password_hash, oidc_sub, is_admin, locale)
- **wishlists** : Listes de souhaits (id, owner_id, title, description, image_url, is_public, share_password_hash)
- **wishlist_collaborators** : Collaborateurs (id, wishlist_id, user_id, role: owner/editor/viewer)
- **items** : Articles (id, wishlist_id, name, url, image_url, description, price, category_id, priority_id, status, sort_order)
- **item_reservations** : Réservations (id, item_id, reserved_by_user_id, reserved_by_name, reserved_at, purchased_at)
- **wishlist_shares** : Partages (id, wishlist_id, share_type: internal/external, target_type, target_id, token, password_hash, permission, expires_at)
- **groups** : Groupes/familles (id, name, description, owner_id, visibility)
- **group_members** : Membres de groupe (id, group_id, user_id, role: admin/member, joined_at)
- **notifications** : Notifications (id, user_id, type, title, message, is_read, related_id, created_at)
- **activities** : Activités (id, user_id, action_type, wishlist_id, item_id, details, created_at)
- **item_categories** : Catégories personnalisées (id, name, color, icon)
- **item_priorities** : Priorités (id, name, level, color, icon)

#### Index optimisés
- Index sur `users.username`, `users.email`, `users.oidc_sub`
- Index sur `wishlists.owner_id`, `items.wishlist_id`
- Index composés pour performances (collaborators, reservations)


## 🚀 Installation & Démarrage

### Prérequis

| Composant | Version minimale | Recommandé |
|-----------|-----------------|------------|
| Docker | 20.10+ | 24.0+ |
| Docker Compose | 2.0+ | 2.20+ |
| Node.js | 18.0+ | 20.0+ (pour dev frontend) |
| Python | 3.11+ | 3.11+ (pour dev backend) |
| PostgreSQL | 15+ | 15+ (si installation locale) |

### Installation rapide avec Docker (Recommandé)

```bash
# 1. Cloner le dépôt
git clone https://github.com/votre-org/wisherr.git
cd wisherr

# 2. Copier et configurer les variables d'environnement
cp .env.example .env

# 3. IMPORTANT: Modifier .env et changer SECRET_KEY
# Générer une clé sécurisée:
openssl rand -hex 32
# Coller la clé dans .env: SECRET_KEY=<votre_clé_générée>

# 4. Démarrer tous les services (db, backend, frontend)
docker compose up -d --build

# 5. Vérifier les logs
docker compose logs -f backend
docker compose logs -f frontend

# 6. Accéder à l'application
# - Frontend: http://localhost:8080
# - Backend API: http://localhost:8000
# - Documentation API: http://localhost:8000/docs
# - Métriques Prometheus: http://localhost:8000/metrics
# - Health check: http://localhost:8000/api/health
```

**Premier démarrage** : Un utilisateur admin est créé automatiquement avec les credentials configurés dans `.env` (voir `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

### Configuration des variables d'environnement

Fichier `.env` (copier depuis `.env.example`) :

```bash
# ======================
# Database
# ======================
DATABASE_URL=postgresql://wisherr:wisherr@db:5432/wisherr

# ======================
# Security & Auth (OBLIGATOIRE)
# ======================
# Générez avec: openssl rand -hex 32
SECRET_KEY=changez_cette_cle_par_une_cle_secrete_de_32_caracteres_minimum

# Authentification locale (username/password)
ENABLE_LOCAL_AUTH=true

# Authentification OIDC/OAuth2 (optionnel)
ENABLE_OIDC_AUTH=false
OIDC_CLIENT_ID=votre_client_id
OIDC_CLIENT_SECRET=votre_client_secret
OIDC_DISCOVERY_URL=https://auth.example.com/.well-known/openid-configuration

# ======================
# CORS - Origins autorisés
# ======================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,http://localhost:8000

# ======================
# Frontend
# ======================
REACT_APP_API_URL=http://localhost:8000

# ======================
# Cache & Performance (optionnel)
# ======================
REDIS_HOST=redis
REDIS_PORT=6379

# ======================
# Monitoring & Health (optionnel)
# ======================
# Hosts externes à vérifier dans /api/health (format: host:port,host2:port2)
HEALTH_EXTERNAL_HOSTS=

# ======================
# Admin User (création automatique au démarrage)
# ======================
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
# Doit respecter: 8+ chars, 1 maj, 1 min, 1 chiffre, 1 spécial
ADMIN_PASSWORD=Admin123!

# ======================
# Localisation
# ======================
LOCALE=fr

# ======================
# Site Configuration
# ======================
SITE_TITLE=Wisherr

# ======================
# Public URL (pour liens de partage externes)
# ======================
WISHERR_URL=http://localhost:8080
```

### Développement local (sans Docker)

#### Backend

```bash
cd backend

# Créer un environnement virtuel Python
python3.11 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows

# Installer Poetry (gestionnaire de dépendances)
pip install poetry

# Installer les dépendances via Poetry
poetry install

# Ou installation manuelle via pip
pip install fastapi uvicorn sqlmodel asyncpg psycopg2-binary \
  python-jose passlib[argon2] python-multipart authlib \
  python-dotenv requests beautifulsoup4 pillow slowapi \
  pydantic[email] alembic redis websockets apscheduler \
  prometheus-client pytest httpx pytest-asyncio pytest-cov

# Démarrer PostgreSQL (via Docker ou local)
docker run -d --name wisherr-db \
  -e POSTGRES_DB=wisherr \
  -e POSTGRES_USER=wisherr \
  -e POSTGRES_PASSWORD=wisherr \
  -p 5432:5432 \
  postgres:15

# Appliquer le schéma initial
psql -h localhost -U wisherr -d wisherr -f ../db/schema.sql

# Lancer le serveur backend
cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Accéder à la doc API: http://localhost:8000/docs
```

#### Frontend

```bash
cd frontend

# Installer les dépendances npm
npm install

# Lancer le serveur de développement
npm start

# Accéder à l'app: http://localhost:3000

# Build production
npm run build
# Les fichiers sont dans frontend/build/
```

### Arrêter les services

```bash
# Arrêter les conteneurs Docker
docker compose down

# Arrêter et supprimer les volumes (⚠️ perte de données)
docker compose down -v
```


## 🎯 Utilisation

### Premiers pas

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

### Guide par rôle

#### Propriétaire de liste (owner)
- ✅ Créer/modifier/supprimer la liste
- ✅ Ajouter/modifier/supprimer des articles
- ✅ Partager la liste (interne/externe)
- ✅ Gérer les collaborateurs (ajouter/retirer/changer permissions)
- ✅ Transférer la propriété à un autre utilisateur
- ✅ Voir l'audit log (qui a fait quoi et quand)
- ❌ Voir les réservations (par défaut, peut être modifié)

#### Éditeur (editor)
- ✅ Voir la liste et tous les articles
- ✅ Ajouter/modifier des articles
- ✅ Réserver des articles (s'il a accès viewer sur d'autres listes)
- ❌ Supprimer la liste
- ❌ Gérer les collaborateurs
- ✅ Voir les réservations

#### Viewer (viewer)
- ✅ Voir la liste et tous les articles
- ✅ Réserver des articles
- ❌ Modifier ou ajouter des articles
- ❌ Gérer la liste ou les collaborateurs

#### Utilisateur externe (lien public)
- ✅ Voir la liste (si mot de passe correct)
- ✅ Réserver des articles (anonyme ou avec nom)
- ❌ Modifier quoi que ce soit

### Fonctionnalités avancées

#### Groupes & Familles
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

#### Notifications
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

#### Fil d'activité
- **Accès**: Menu "Activités" ou dashboard
- **Contenu**: Actions récentes sur vos listes et listes partagées
  - Création/modification de listes
  - Ajout/modification d'articles
  - Réservations (visibles uniquement pour vous)
  - Invitations et partages
- **Filtres**: Par type d'action, par liste, par date

#### Scraping automatique
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


## 📚 API Documentation

### Endpoints principaux

#### Authentification (`/auth`)
- `POST /auth/register` - Créer un compte
- `POST /auth/login` - Se connecter (JWT token)
- `POST /auth/logout` - Se déconnecter
- `GET /auth/me` - Profil utilisateur connecté
- `PUT /auth/profile` - Modifier son profil

#### Listes de souhaits (`/wishlists`)
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

#### Articles (`/items`)
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

#### Partages (`/shares`)
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

#### Groupes (`/groups`)
- `GET /groups` - Mes groupes
- `GET /groups/{group_id}` - Détail d'un groupe
- `POST /groups` - Créer un groupe
- `PUT /groups/{group_id}` - Modifier un groupe
- `DELETE /groups/{group_id}` - Supprimer un groupe
- `POST /groups/{group_id}/members` - Ajouter un membre
- `DELETE /groups/{group_id}/members/{user_id}` - Retirer un membre
- `GET /groups/{group_id}/check-user/{username}` - Vérifier si utilisateur existe

#### Notifications (`/notifications`)
- `GET /notifications` - Liste des notifications (paginées)
- `GET /notifications/count` - Nombre de notifications non lues
- `POST /notifications/mark-read` - Marquer notification(s) comme lue(s)
- `POST /notifications/mark-all-read` - Marquer toutes comme lues
- `DELETE /notifications/{notification_id}` - Supprimer une notification
- `DELETE /notifications` - Supprimer toutes les notifications

#### Activités (`/activities`)
- `GET /activities/feed` - Fil d'activité complet (paginé)
- `GET /activities/recent` - Activités récentes (10 dernières)

#### Scraping (`/scrape`)
- `POST /scrape` - Scraper une URL (titre, description, image, prix)

#### Admin (`/admin`)
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

#### Public (`/public`)
- `GET /public/site-info` - Informations publiques du site (titre, locale, features)

#### Monitoring
- `GET /api/health` - Health check (DB, cache, uptime, latence)
- `GET /metrics` - Métriques Prometheus

### Documentation interactive

Accédez à la documentation Swagger interactive : **http://localhost:8000/docs**

Features:
- Tester tous les endpoints directement depuis le navigateur
- Voir les schémas de requête/réponse
- Authentification JWT intégrée (bouton "Authorize")
- Examples de requêtes/réponses

Alternative ReDoc : **http://localhost:8000/redoc**


## 📊 Monitoring & Observabilité

### Métriques Prometheus

L'application expose des métriques sur `/metrics` :

```bash
# Requêtes HTTP
http_requests_total{method="GET",path="/api/wishlists",status="200"}

# Latence
http_request_latency_seconds{method="GET",path="/api/wishlists"}
```

### Health Check

```bash
curl http://localhost:8000/api/health
```

Retourne :
- ✅ Statut DB (latence incluse)
- ✅ Statut Cache Redis (si configuré)
- ✅ Uptime serveur
- ✅ Version Python

## 🔒 Sécurité

### Mesures implémentées

✅ **Rate limiting** : 5 req/min sur `/register`, 10 req/min sur `/login`  
✅ **Validation mots de passe** : 8+ chars, majuscule, minuscule, chiffre, spécial  
✅ **JWT sécurisé** avec SECRET_KEY obligatoire (32+ chars)  
✅ **CORS configuré** via ALLOWED_ORIGINS  
✅ **Index database** pour performances  
✅ **Logs structurés** JSON  
✅ **Cache Redis** pour réduire charge DB  

### Recommandations production

1. **SECRET_KEY** : Générer avec `openssl rand -hex 32` et stocker dans secrets manager
2. **HTTPS** : Activer TLS/SSL (nginx reverse proxy + Let's Encrypt)
3. **Firewall** : Restreindre accès DB/Redis (uniquement depuis backend)
4. **Backups** : Automatiser backups PostgreSQL quotidiens (pg_dump + S3/Minio)
5. **Updates** : Surveiller dépendances (Dependabot, npm audit, renovate)
6. **Sécurité headers** : Helmet.js, CSP, HSTS, X-Frame-Options
7. **Monitoring** : Intégrer Prometheus + Grafana pour dashboards
8. **Logs centralisés** : Envoyer logs vers ELK stack ou Loki
9. **Secrets rotation** : Rotation automatique SECRET_KEY, DB passwords
10. **Audit de sécurité** : Scan régulier avec Bandit, Trivy, OWASP Dependency-Check

## 🎨 Interface Utilisateur

### Design System

**Thème moderne Glassmorphism**:
- Effets de transparence (backdrop-filter: blur)
- Dégradés subtils (gradients)
- Ombres douces (shadows)
- Bordures arrondies (rounded corners)

**Dark/Light Mode**:
- Détection automatique via `prefers-color-scheme`
- Switch manuel (icône soleil/lune)
- Persistance dans localStorage
- Transition fluide entre thèmes

**Typographie**:
- Police principale : Inclusive Sans (accessibilité optimale)
- Tailles responsives (clamp)
- Line-height adapté pour lisibilité
- Contraste WCAG AAA

**Couleurs**:
- Palette cohérente (primaire, secondaire, accent)
- États (hover, active, disabled, focus)
- Semantic colors (success, warning, error, info)
- Gradients pour boutons CTA

### Composants UI

**Cartes (Cards)**:
- `glass-card` : Effet verre avec blur et transparence
- `glass-card-hover` : Animation au survol
- Ombres adaptatives selon le thème

**Boutons**:
- `btn-primary` : Gradient principal avec hover effect
- `btn-outline` : Bordure + hover fill
- `btn-ghost` : Transparent, hover background
- Loading states avec spinner

**Inputs & Forms**:
- `input-modern` : Focus ring animé
- Validation inline (erreur, succès)
- Placeholder avec transition
- Autocomplete styling

**Animations**:
- `animate-fadeIn` : Apparition progressive
- `animate-slideIn` : Slide depuis la gauche/droite
- `animate-pulse` : Pulsation pour chargement
- Transitions CSS pour tous les états

**Icônes**:
- Lucide React (cohérence visuelle)
- Taille adaptative (16px, 20px, 24px)
- Stroke width uniforme
- Couleurs thématiques

### Responsive Design

**Breakpoints Tailwind**:
- `sm`: 640px (mobile landscape)
- `md`: 768px (tablette portrait)
- `lg`: 1024px (tablette landscape, laptop)
- `xl`: 1280px (desktop)
- `2xl`: 1536px (large desktop)

**Layout**:
- Mobile-first approach
- Sidebar collapsible sur mobile
- Grids adaptatives (1/2/3/4 colonnes)
- Stack vertical sur petit écran

**Navigation**:
- Sidebar fixe desktop, drawer mobile
- Bottom navigation mobile (optionnel)
- Breadcrumbs desktop, back button mobile

### Accessibilité (a11y)

✅ Semantic HTML (header, nav, main, footer, article)  
✅ ARIA labels et roles  
✅ Focus visible sur tous les éléments interactifs  
✅ Contraste WCAG AAA (7:1 texte, 4.5:1 UI)  
✅ Skip links (keyboard navigation)  
✅ Screen reader friendly  
✅ Alt text sur toutes les images  
✅ Formulaires avec labels associés  


## 📦 Build & Déploiement Production

### Build local

A FAIRE

### CI/CD Pipelines

**GitLab CI** (`.gitlab-ci.yml`) : Pipeline complet avec stages lint, test, build, docker, deploy (voir fichier pour détails)

**GitHub Actions** (`.github/workflows/deploy.yml`) : CI/CD automatique sur push main/tags

### Monitoring Production

**Prometheus + Grafana**:
- Scraper l'endpoint `/metrics`
- Créer dashboards : latence, throughput, erreurs, uptime
- Alerting : latence > 500ms, error rate > 5%, DB down

**Logs centralisés**:
- ELK Stack (Elasticsearch + Logstash + Kibana)
- Loki + Grafana
- CloudWatch (AWS) ou Stackdriver (GCP)

**APM**:
- Sentry (erreurs frontend/backend)
- New Relic ou DataDog (performances)
- OpenTelemetry (traces distribuées)


## 📝 Roadmap & Développement Futur

### ✅ Complété (v0.1)
- [x] Authentification locale (username/password) avec JWT
- [x] Authentification OIDC/OAuth2 (SSO)
- [x] CRUD listes de souhaits avec permissions granulaires
- [x] CRUD articles avec scraping automatique
- [x] Réservations privées et marquage "acheté"
- [x] Partage interne (utilisateurs) et externe (liens publics)
- [x] Groupes/familles avec gestion de membres
- [x] Notifications temps réel
- [x] Fil d'activité et audit logs
- [x] Internationalisation (FR, EN)
- [x] Panel admin complet
- [x] Tests unitaires (backend + frontend)
- [x] CI/CD (GitHub Actions + GitLab CI)
- [x] Cache Redis pour performances
- [x] Rate limiting sur endpoints sensibles
- [x] Métriques Prometheus et health checks
- [x] Logs structurés JSON
- [x] Docker Compose pour orchestration

### 🚧 En cours (v1.0)
- [x] Dark/Light mode
- [ ] Notifications push (WebSockets ou Server-Sent Events)
- [ ] Amélioration scraping (support plus de sites e-commerce)
- [ ] PWA (Progressive Web App) avec offline support
- [ ] Webhooks pour notifications externes (Slack, Discord, etc.)
- [ ] Catégories, méthodes de tri

### 🔮 Futur (v2.0+)
- [ ] Application mobile native (React Native ou Flutter) ?
- [ ] Suggestions d'articles basées sur ML (collaborative filtering) ?
- [ ] Intégration e-commerce (Amazon API, tracking prix) ?
- [ ] Multi-tenancy (instances dédiées par organisation) ?
- [ ] Kube ?

### Priorités techniques
- [ ] Migration vers PostgreSQL 16 (performance JSON queries)
- [ ] Upgrade React 19 stable (actuellement RC)
- [ ] Implémentation OpenTelemetry (tracing distribué)
- [ ] Tests E2E avec Playwright
- [ ] Amélioration coverage tests (objectif 90%+)
- [ ] Documentation OpenAPI 3.1
- [ ] Kubernetes Helm charts
- [ ] Terraform modules pour IaC


## 🤝 Contribution

Nous accueillons les contributions de la communauté ! Que vous souhaitiez corriger un bug, ajouter une fonctionnalité ou améliorer la documentation, toute aide est appréciée.

### Comment contribuer

1. **Fork le projet**
   ```bash
   git clone https://github.com/votre-org/wisherr.git
   cd wisherr
   ```

2. **Créer une branche**
   ```bash
   git checkout -b feature/AmazingFeature
   # ou
   git checkout -b fix/BugFix
   ```

3. **Faire vos modifications**
   - Respecter les conventions de code (voir ci-dessous)
   - Ajouter des tests pour les nouvelles fonctionnalités
   - Mettre à jour la documentation si nécessaire

4. **Tester vos modifications**
   ```bash
   # Backend
   cd backend && pytest

   # Frontend
   cd frontend && npm test

   # Linting
   cd backend && ruff check app/
   cd frontend && npm run lint
   ```

5. **Commit vos changements**
   ```bash
   git add .
   git commit -m 'feat: Add amazing feature'
   # Format: <type>: <description>
   # Types: feat, fix, docs, style, refactor, test, chore
   ```

6. **Push vers votre fork**
   ```bash
   git push origin feature/AmazingFeature
   ```

7. **Ouvrir une Pull Request**
   - Décrire clairement les changements
   - Référencer les issues liées (#123)
   - Attendre la review et les retours

### Guidelines de contribution

#### Code Style

**Backend (Python)**:
- Suivre PEP 8
- Utiliser Black pour le formatage (line-length 100)
- Utiliser Ruff pour le linting
- Typage strict avec type hints
- Docstrings Google style

**Frontend (TypeScript)**:
- Suivre ESLint config (Airbnb base)
- Prettier pour formatage automatique
- Typage TypeScript strict
- Composants fonctionnels avec hooks
- Props typées avec interfaces

#### Tests

- ✅ **Ajouter des tests** pour toute nouvelle fonctionnalité
- ✅ **Maintenir coverage** à 80%+ minimum
- ✅ **Tests unitaires** : Fonctions, composants isolés
- ✅ **Tests d'intégration** : Endpoints API, flows utilisateur
- ✅ **Nommer les tests** clairement : `test_create_wishlist_with_valid_data`

#### Documentation

- ✅ **Documenter les fonctions** complexes (docstrings, JSDoc)
- ✅ **Mettre à jour README** si changement dans installation/usage
- ✅ **Ajouter examples** pour nouvelles fonctionnalités API
- ✅ **Changelog** : Noter les breaking changes dans CHANGELOG.md

#### Commit Messages

Format : `<type>(<scope>): <subject>`

**Types**:
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation seulement
- `style`: Formatage (sans impact sur le code)
- `refactor`: Refactoring (ni feat ni fix)
- `test`: Ajout/modification de tests
- `chore`: Tâches maintenance (deps, config)

**Exemples**:
```bash
feat(items): Add category filter on items list
fix(auth): Resolve JWT expiration bug
docs(readme): Update installation instructions
refactor(wishlists): Extract collaborator logic to service
test(shares): Add tests for external share creation
```

### Code Review Process

1. **Soumission PR** : Description détaillée, screenshots si UI
2. **Automated checks** : CI/CD doit passer (tests, linting)
3. **Review** : Au moins 1 approbation requise
4. **Retours** : Répondre aux commentaires, faire les modifications
5. **Merge** : Squash commits pour garder historique propre

### Priorités de contribution

**High Priority** (Bienvenue !):
- Amélioration coverage tests
- Documentation (guides, examples)
- Accessibilité (a11y)
- Performance optimizations
- Bugs critiques (issues labellées `critical`)

**Medium Priority**:
- Nouvelles fonctionnalités (issues labellées `enhancement`)
- Refactoring (améliorer qualité code)
- i18n (nouvelles langues)

**Low Priority** (Après discussion):
- Changements architecturaux majeurs
- Nouvelles dépendances (justification requise)
- Breaking changes (seulement pour v2.0+)

### Questions & Support

- 🐛 **Bugs** : Ouvrir une issue GitHub avec template bug
- 💡 **Feature requests** : Ouvrir une issue avec template feature
- 💬 **Discussions** : GitHub Discussions pour questions générales

### Code of Conduct

Nous attendons de tous les contributeurs qu'ils respectent notre [Code of Conduct](CODE_OF_CONDUCT.md):
- ✅ Être respectueux et inclusif
- ✅ Accepter les critiques constructives
- ✅ Collaborer de manière professionnelle
- ❌ Harcèlement, discrimination, trolling interdits



## 📄 Licence

CC BY-NC : adenyrr
License - Voir [LICENSE](LICENSE)

## 👥 Équipe

- **Architecture & Backend** : [@architecte-logiciel](agents)
- **DevOps & Infrastructure** : [@sre-devops](agents)
- **Sécurité** : [@analyse-securite-code](agents)
- **Documentation** : [@documentation-support](agents)

## 📞 Support

- 🐛 **Issues** : https://github.com/votre-org/wisherr/issues
- 💬 **Discussions** : https://github.com/votre-org/wisherr/discussions

---

**Fait avec ❤️ et GitHub Copilot**
