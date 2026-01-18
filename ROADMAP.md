# Roadmap & Développement Futur

## ✅ Complété (v0.1)
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

## 🚧 En cours (v1.0)
- [x] Dark/Light mode
- [ ] Notifications push (WebSockets ou Server-Sent Events)
- [ ] Amélioration scraping (support plus de sites e-commerce)
- [ ] PWA (Progressive Web App) avec offline support
- [ ] Webhooks pour notifications externes (Slack, Discord, etc.)
- [ ] Catégories, méthodes de tri

## 🔮 Futur (v2.0+)
- [ ] Application mobile native (React Native ou Flutter) ?
- [ ] Suggestions d'articles basées sur ML (collaborative filtering) ?
- [ ] Intégration e-commerce (Amazon API, tracking prix) ?
- [ ] Multi-tenancy (instances dédiées par organisation) ?
- [ ] Kube ?

## Priorités techniques
- [ ] Migration vers PostgreSQL 16 (performance JSON queries)
- [ ] Upgrade React 19 stable (actuellement RC)
- [ ] Implémentation OpenTelemetry (tracing distribué)
- [ ] Tests E2E avec Playwright
- [ ] Amélioration coverage tests (objectif 90%+)
- [ ] Documentation OpenAPI 3.1
- [ ] Kubernetes Helm charts
- [ ] Terraform modules pour IaC