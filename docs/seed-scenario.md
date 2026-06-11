# Scénario seed démo AERONEXIS

Données partagées via `@aeronexis/shared` (`packages/shared/src/seed-scenario.ts`).  
Réinitialisation recommandée :

```bash
pnpm docker:apps:up   # ou docker:up + dev:backend
pnpm db:reset         # migrate + seed (auth → … → audit → notification)
pnpm db:verify-seed   # assertions post-seed (optionnel)
```

## Sites

| Code | Nom |
|------|-----|
| `SITE-LYO` | Lyon (principal) |
| `SITE-PAR` | Paris |

## Comptes (mot de passe : `SEED_ADMIN_PASSWORD`)

| Rôle | Email | ID fixe (audit) |
|------|-------|-----------------|
| operateur | `operateur@aeronexis.local` | `clh7seedauthoper000000001` |
| logistique | `logistique@aeronexis.local` | `clh7seedauthlogi000000001` |
| commercial | `commercial@aeronexis.local` | `clh7seedauthcomm000000001` |
| direction | `direction@aeronexis.local` | `clh7seedauthdire000000001` |
| admin | `admin@aeronexis.local` | `clh7seedauthadmin00000001` |

## Commandes Lyon

| Numéro | Statut | Usage UI |
|--------|--------|----------|
| `CMD-2025-00001` | DRAFT | Commercial : valider |
| `CMD-2025-00002` | DRAFT + urgent | Priorité + delay-risk |
| `CMD-2025-00003` | VALIDATED | Historique statuts |
| `CMD-2025-00004` | IN_PRODUCTION | Lié `BATCH-SEED-001` |
| `CMD-2025-00005` | DELIVERED | Funnel complet |

Paris : `CMD-PAR-00001` (DRAFT).

## Production

| Lot | Statut | Détail |
|-----|--------|--------|
| `BATCH-SEED-001` | IN_PROGRESS 25 % | Anomalie `ANOMALY-SEED-001` ouverte |
| `BATCH-SEED-002` | COMPLETED 100 % | KPI avancement |
| `BATCH-SEED-PAR-001` | PENDING | Multi-site |

Nomenclatures : `BOM-SEED-001` (IN_PROGRESS), `BOM-SEED-002` (plaque).

## Stock

- Alerte critique titane (`MAT-002`), retard fournisseur AeroMat FR
- 2 réservations ACTIVE sur `BATCH-SEED-001` (MAT-001, MAT-002)
- Mouvement retour (`RET-2025-001`) pour `/inventaire/returned`

## Expéditions

| Code | Statut | Commande |
|------|--------|----------|
| `SHP-2025-00001` | PLANNED | CMD-2025-00001 |
| `SHP-2025-00002` | IN_TRANSIT | CMD-2025-00004 |
| `SHP-2025-00003` | DELIVERED | CMD-2025-00005 |

## Audit (MongoDB)

- 10 entrées `audit_logs` (login, validation, réservation, anomalie, expéditions)
- 3 `critical_events` (rupture titane, lot retard, retard fournisseur)
- `event_history` : traçabilité lot + `production.batch.anomaly_reported` + `shipment.delivered`

## Notifications (Redis)

- 4 notifications `SITE-LYO` (stock, fournisseur, expédition, anomalie lot)
- 1 notification `SITE-PAR`

## Parcours par rôle (15 min)

| Rôle | Pages |
|------|-------|
| **operateur** | `/bom`, `/batch` — anomalie + traçabilité |
| **logistique** | `/inventaire/spare`, `/delivery` — réservations + 3 statuts expédition |
| **commercial** | `/commands` — draft/urgent + historique |
| **direction** | `/dashboard`, `/notifications`, `/activity` — KPI + incidents |
