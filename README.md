<div align="center">

![Wisherr Banner](frontend/public/wisherr-banner.png)

---

[![License: CC BY-NC](https://img.shields.io/badge/License-CC%20BY--NC-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](INSTALLATION.md)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)

*Une application web moderne et complète pour créer, gérer et partager vos listes de souhaits*

[🚀 Installation](INSTALLATION.md) • [📖 Documentation](USAGE.md) • [🔧 API](API.md) • [🏗️ Architecture](ARCHITECTURE.md) • [🗺️ Roadmap](ROADMAP.md) <br />
## • [English version](README_EN.md) •

---

</div>

> ⚡ **Note :** Cette application a été *vibe‑codée* — développée à l'aide de plusieurs agents et LLM.

Une application web moderne et complète pour créer, gérer et partager vos listes de souhaits. Wisherr permet aux utilisateurs de créer des listes de cadeaux, de les partager avec leurs proches (famille, amis, groupes), et d'éviter les doublons grâce aux réservations privées.

## ✨ Fonctionnalités principales

- 🔐 **Authentification sécurisée** : Locale (username/password) ou OIDC/SSO avec JWT
- 📝 **Gestion de listes** : CRUD complet avec permissions granulaires (owner/editor/viewer)
- 🎯 **Articles détaillés** : Scraping automatique, catégories, priorités, réservations privées
- 👥 **Partage flexible** : Interne (utilisateurs/groupes) ou externe (liens publics)
- 🏘️ **Groupes & familles** : Organisation des proches avec gestion de membres
- 🔔 **Notifications temps réel** : Réservations, partages, activités
- 🌍 **Internationalisation** : Français et Anglais
- 🎨 **Interface moderne** : Dark/Light mode, responsive, Glassmorphism
- 📊 **Monitoring complet** : Métriques Prometheus, health checks, logs
- 🛡️ **Administration** : Panel admin avec stats, gestion utilisateurs, config

## 📚 Documentation

- **[Installation & Démarrage](INSTALLATION.md)** - Guide complet d'installation (Docker recommandé)
- **[Utilisation](USAGE.md)** - Premiers pas, guides par rôle, fonctionnalités avancées
- **[API Documentation](API.md)** - Tous les endpoints avec exemples
- **[Architecture](ARCHITECTURE.md)** - Vue d'ensemble technique et diagramme
- **[Roadmap](ROADMAP.md)** - Fonctionnalités présentes et à venir
- **[Contributing](CONTRIBUTING.md)** - Guide de contribution et développement

## 🚀 Installation rapide

### Prérequis
- Docker 20.10+ et Docker Compose 2.0+

### Démarrage

```bash
# Récupérer les fichiers de configuration depuis le dépôt
curl -fsSL -o compose.yaml https://raw.githubusercontent.com/adenyrr/wisherr/refs/heads/master/compose.yaml
curl -fsSL -o .env.example https://raw.githubusercontent.com/adenyrr/wisherr/refs/heads/master/.env.example

# Copier et configurer
cp .env.example .env
nano .env

# Démarrer la stack (utilise les images Docker Hub définies dans compose.yaml)
docker compose up -d
```

Accès :
- **Frontend** : http://localhost:8080
- **API Docs** : http://localhost:8000/docs
- **Métriques** : http://localhost:8000/metrics

Premier utilisateur admin créé automatiquement (voir `.env`).

## 🔒 Sécurité

- Rate limiting sur endpoints sensibles
- Validation stricte des mots de passe
- JWT sécurisé avec SECRET_KEY obligatoire
- CORS configuré
- Logs structurés JSON
- Audit logs pour traçabilité

## 📞 Support

- 🐛 **Issues** : [GitHub Issues](https://github.com/votre-org/wisherr/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/votre-org/wisherr/discussions)
- 📖 **Documentation** : Voir les liens ci-dessus

## 📄 Licence

CC BY-NC : adenyrr - Voir [LICENCE](LICENCE)
## 👥 Équipe

- **Architecture & Backend** : [@architecte-logiciel](./github/agents)
- **DevOps & Infrastructure** : [@sre-devops](./github/agents)
- **Sécurité** : [@analyse-securite-code](./github/agents)
- **Documentation** : [@documentation-support](./github/agents)

## 📸 Screenshots

<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:flex-start;">
  <figure style="width:220px;margin:0;">
    <a href="assets/dashboard_fr.webp"><img loading="lazy" src="assets/dashboard_fr.webp" alt="Dashboard" style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(2,6,23,0.6);"></a>
    <figcaption style="text-align:center;font-size:0.9rem;margin-top:6px">Dashboard</figcaption>
  </figure>

  <figure style="width:220px;margin:0;">
    <a href="assets/addlist_fr.webp"><img loading="lazy" src="assets/addlist_fr.webp" alt="Créer une liste" style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(2,6,23,0.6);"></a>
    <figcaption style="text-align:center;font-size:0.9rem;margin-top:6px">Créer une liste</figcaption>
  </figure>

  <figure style="width:220px;margin:0;">
    <a href="assets/additem_fr.webp"><img loading="lazy" src="assets/additem_fr.webp" alt="Ajouter un article" style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(2,6,23,0.6);"></a>
    <figcaption style="text-align:center;font-size:0.9rem;margin-top:6px">Ajouter un article</figcaption>
  </figure>

  <figure style="width:220px;margin:0;">
    <a href="assets/sharing_fr.webp"><img loading="lazy" src="assets/sharing_fr.webp" alt="Partage public" style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(2,6,23,0.6);"></a>
    <figcaption style="text-align:center;font-size:0.9rem;margin-top:6px">Partage public / Lien</figcaption>
  </figure>

  <figure style="width:220px;margin:0;">
    <a href="assets/backend_API.webp"><img loading="lazy" src="assets/backend_API.webp" alt="API Backend" style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(2,6,23,0.6);"></a>
    <figcaption style="text-align:center;font-size:0.9rem;margin-top:6px">API Backend (admin)</figcaption>
  </figure>

  <figure style="width:220px;margin:0;">
    <a href="assets/shared_fr.webp"><img loading="lazy" src="assets/shared_fr.webp" alt="Liste partagée" style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(2,6,23,0.6);"></a>
    <figcaption style="text-align:center;font-size:0.9rem;margin-top:6px">Liste partagée</figcaption>
  </figure>
</div>

> Cliquez sur une miniature pour ouvrir l'image en taille réelle.

---
