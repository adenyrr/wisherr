# Installation & Démarrage

## Prérequis

| Composant | Version minimale | Recommandé |
|-----------|-----------------|------------|
| Docker | 20.10+ | 24.0+ |
| Docker Compose | 2.0+ | 2.20+ |
| Node.js | 18.0+ | 20.0+ (pour dev frontend) |
| Python | 3.11+ | 3.11+ (pour dev backend) |
| PostgreSQL | 15+ | 15+ (si installation locale) |

## Installation rapide avec Docker (Recommandé)

```bash
# 1. Créer un répertoire pour le projet
mkdir wisherr && cd wisherr

# 2. Télécharger les fichiers nécessaires
curl -O https://raw.githubusercontent.com/adenyrr/wisherr/main/compose.yaml
curl -O https://raw.githubusercontent.com/adenyrr/wisherr/main/.env.example

# 3. Copier et configurer les variables d'environnement
cp .env.example .env

# 4. IMPORTANT: Modifier .env et changer SECRET_KEY
# Générer une clé sécurisée:
openssl rand -hex 32
# Coller la clé dans .env: SECRET_KEY=<votre_clé_générée> + MODIFIER ADMIN !

# 5. Démarrer tous les services (db, backend, frontend)
docker compose up -d --build

# 6. Vérifier les logs
docker compose logs -f backend
docker compose logs -f frontend

# 7. Accéder à l'application
# - Frontend: http://localhost:8080
# - Backend API: http://localhost:8000
# - Documentation API: http://localhost:8000/docs
# - Métriques Prometheus: http://localhost:8000/metrics
# - Health check: http://localhost:8000/api/health
```

**Premier démarrage** : Un utilisateur admin est créé automatiquement avec les credentials configurés dans `.env` (voir `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

## Configuration des variables d'environnement

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

## Développement local (sans Docker)

### Backend

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

### Frontend

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

## Arrêter les services

```bash
# Arrêter les conteneurs Docker
docker compose down

# Arrêter et supprimer les volumes (⚠️ perte de données)
docker compose down -v
```