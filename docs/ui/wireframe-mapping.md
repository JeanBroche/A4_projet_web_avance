# Wireframe mapping — AERONEXIS ERP (front Nuxt)

Ce document relie les écrans implémentés aux rôles métier et aux composants réutilisables.

## Architecture UI

| Couche | Dossier | Rôle |
|--------|---------|------|
| Pages | `apps/web/app/pages/` | Écrans par route |
| Layout | `apps/web/app/layouts/sidebar.vue` | Navigation RBAC unifiée |
| Composants | `apps/web/app/components/` | `PageHeader`, `AsyncListState`, `ConfirmDeleteModal`, `RoleNotificationBar` |

## Mapping route ↔ rôle ↔ fonctionnalité

| Route | Rôles | Fonctionnalité brief |
|-------|-------|----------------------|
| `/` | public | Connexion |
| `/batch` | operateur, admin | Lots liés à un OF, anomalies, statuts, **traçabilité complète** (timeline mock) |
| `/bom` | operateur, logistique, admin | Consultation OF, réservations, signalement incident nomenclature |
| `/inventaire/spare` | operateur (lecture), logistique | Stock + réservations + **prévision rupture** + **retard fournisseur** |
| `/inventaire/returned` | operateur (lecture), logistique | Articles retournés |
| `/commands` | commercial, admin | Commandes, validation, **stats client**, historique, **commandes spéciales (urgent)** |
| `/delivery` | commercial, logistique, admin | Expéditions liées aux commandes |
| `/dashboard` | direction, admin | **4 piliers** (production, stocks, commercial, finance), incidents & traçabilité, marges par OF, **agrégation multi-sites** (Lyon / Paris / Ensemble) |
| `/notifications` | logistique, direction, admin | Centre de notifications |
| `/activity` | tous | Historique / traçabilité filtrée par utilisateur |

## Scénario soutenance (15 min)

1. **Opérateur** — `/bom` consulter OF → `/batch` créer lot lié → signaler anomalie → **traçabilité complète**
2. **Logistique** — `/inventaire/spare` stock + réservations → `/bom` réserver matières → `/delivery` expédition
3. **Commercial** — `/commands` valider commande urgente → indicateur risque retard → `/delivery`
4. **Direction** — `/dashboard` 4 piliers KPI (filtre site / consolidé) → incidents & traçabilité → marges par OF → `/activity`

## Comptes démo

Voir [`docs/seed-scenario.md`](../seed-scenario.md) (gateway) et [`apps/web/README.md`](../../apps/web/README.md) (mock offline).

## Accessibilité

### Patterns en place

- Layout : lien d'évitement « Aller au contenu » → `#main-content` ([`sidebar.vue`](../../apps/web/app/layouts/sidebar.vue))
- Modales : `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (titre avec `id`)
- Erreurs formulaire : `role="alert"` sur les messages Zod / `UAlert`
- Page login : titre `<h1>` unique, `role="alert"` sur erreur, animations respectant `prefers-reduced-motion`
- Barre notifications : `aria-label` + `aria-expanded` / `aria-controls`
- Utilitaires : `.sr-only`, `FIELD_HINT`, `SKIP_LINK_CLASSES` dans [`a11y.ts`](../../apps/web/app/utils/a11y.ts)

### Checklist — nouvelle page ou modale

- [ ] Lien d'évitement accessible (layout sidebar)
- [ ] Modale : `role="dialog"`, `aria-modal="true"`, `aria-labelledby` sur le `<h2>`
- [ ] Boutons icône seuls : `aria-label` explicite (fermer, modifier, supprimer, envoyer…)
- [ ] Champs recherche : `<label class="sr-only">` ou `UFormField` avec label visible
- [ ] Erreurs : `role="alert"`
- [ ] Statuts : texte + couleur (pas la couleur seule)
- [ ] Mises à jour dynamiques (chat, chargement) : `aria-live` / `role="status"` si pertinent
- [ ] Animations décoratives : `@media (prefers-reduced-motion: no-preference)`
- [ ] Textes secondaires : préférer `text-gray-500` plutôt que `text-gray-400` sur fond clair
- [ ] Libellés rôles : formulations neutres ([`roles.ts`](../../apps/web/app/lib/roles.ts))

### Lint

`eslint-plugin-vuejs-accessibility` est activé en **warn** dans [`apps/web/eslint.config.mjs`](../../apps/web/eslint.config.mjs).

## Écarts documentés vs maquettes papier

- Layout unique `sidebar` pour tous les rôles (ERP unifié) au lieu de 4 shells distincts (`layouts/production.vue`, etc. — squelettes conservés pour le rapport).
- Graphique « Santé supply chain » retiré du dashboard (données mock non fiables).
