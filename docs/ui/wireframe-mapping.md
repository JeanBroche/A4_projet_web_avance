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
| `/dashboard` | direction, admin | KPI, incidents, **sélecteur de site** (Lyon / Paris / Ensemble) |
| `/notifications` | logistique, direction, admin | Centre de notifications |
| `/activity` | tous | Historique / traçabilité filtrée par utilisateur |

## Scénario soutenance (15 min)

1. **Opérateur** — `/bom` consulter OF → `/batch` créer lot lié → signaler anomalie → **traçabilité complète**
2. **Logistique** — `/inventaire/spare` stock + réservations → `/bom` réserver matières → `/delivery` expédition
3. **Commercial** — `/commands` valider commande urgente → indicateur risque retard → `/delivery`
4. **Direction** — `/dashboard` KPI (filtre site) → incidents critiques → `/activity`

## Comptes démo

Voir [`docs/seed-scenario.md`](../seed-scenario.md) (gateway) et [`apps/web/README.md`](../../apps/web/README.md) (mock offline).

## Accessibilité

- Modales principales : `role="dialog"` + `aria-labelledby`
- Erreurs formulaire : `role="alert"` sur les messages Zod
- Page login : titre `<h1>` unique
- Barre notifications : `aria-expanded` / `aria-controls`

## Écarts documentés vs maquettes papier

- Layout unique `sidebar` pour tous les rôles (ERP unifié) au lieu de 4 shells distincts (`layouts/production.vue`, etc. — squelettes conservés pour le rapport).
- Graphique « Santé supply chain » retiré du dashboard (données mock non fiables).
