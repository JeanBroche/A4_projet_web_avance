# A4_projet_web_avance

Projet web avancé.

## Intégration continue

[GitHub Actions](https://github.com/JeanBroche/A4_projet_web_avance/actions) et [Dependabot](.github/dependabot.yml) automatisent la qualité du dépôt.

### À chaque push / pull request

| Workflow | Rôle |
|----------|------|
| **CI** | Lint Markdown ; lint, tests et build Node.js (si `package.json` présent) |
| **Security** | Détection de secrets exposés (Gitleaks) |
| **Link check** | Vérification des liens dans les fichiers Markdown |
| **Spell check** | Orthographe des workflows (fichiers en anglais) |
| **Workflows lint** | Validation syntaxique des fichiers workflow (actionlint) |
| **CodeQL** | Analyse de sécurité du code JS/TS (dès qu'il y a du code source) |

### Sur les pull requests uniquement

| Workflow | Rôle |
|----------|------|
| **PR Labeler** | Étiquettes automatiques selon les fichiers modifiés |
| **Dependency review** | Revue des dépendances vulnérables (si fichier lock npm/yarn/pnpm) |

### Planifié / manuel

| Workflow | Rôle |
|----------|------|
| **Stale** | Ferme les issues/PR inactives (chaque lundi) |
| **CodeQL** | Analyse hebdomadaire complémentaire |
| **Dependabot** | PR de mise à jour des actions GitHub (hebdomadaire) |

### Labels pour le labeler automatique

Créez sur GitHub les labels : `documentation`, `github`, `frontend`, `backend` (couleurs au choix) pour que **PR Labeler** fonctionne correctement.

### Protection de branche (recommandé)

Dans **Settings → Branches**, sur `main` : exiger une PR et les checks **CI / Markdown lint**, **Security / Secret scan**, **Link check / Check Markdown links**.
