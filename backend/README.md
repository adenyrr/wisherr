# Wisherr Backend

API backend pour la plateforme Wisherr (FastAPI, PostgreSQL, Auth, i18n)

## Démarrage rapide

1. Copier `.env.example` en `.env` et adapter les variables
2. Installer les dépendances (via Poetry)
3. Lancer le serveur :

```bash
poetry install
poetry run uvicorn app.main:app --reload
```

## Structure
- `app/main.py` : point d’entrée FastAPI
- `app/models.py` : modèles SQLModel
- `app/db.py` : connexion et initialisation DB
- `db/migrations/` : scripts SQL de migration

## Variables d’environnement
Voir `.env.example`
