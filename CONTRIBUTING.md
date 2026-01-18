# Contribution

Nous accueillons les contributions de la communauté ! Que vous souhaitiez corriger un bug, ajouter une fonctionnalité ou améliorer la documentation, toute aide est appréciée.

## Comment contribuer

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

## Guidelines de contribution

### Code Style

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

### Tests

- ✅ **Ajouter des tests** pour toute nouvelle fonctionnalité
- ✅ **Maintenir coverage** à 80%+ minimum
- ✅ **Tests unitaires** : Fonctions, composants isolés
- ✅ **Tests d'intégration** : Endpoints API, flows utilisateur
- ✅ **Nommer les tests** clairement : `test_create_wishlist_with_valid_data`

### Documentation

- ✅ **Documenter les fonctions** complexes (docstrings, JSDoc)
- ✅ **Mettre à jour README** si changement dans installation/usage
- ✅ **Ajouter examples** pour nouvelles fonctionnalités API
- ✅ **Changelog** : Noter les breaking changes dans CHANGELOG.md

### Commit Messages

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