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

| Rôle | Email | Site | ID fixe (audit) |
|------|-------|------|-----------------|
| operateur | `operateur@aeronexis.local` | Lyon | `clh7seedauthoper000000001` |
| logistique | `logistique@aeronexis.local` | Lyon | `clh7seedauthlogi000000001` |
| commercial | `commercial@aeronexis.local` | **Paris** | `clh7seedauthcomm000000001` |
| direction | `direction@aeronexis.local` | Lyon | `clh7seedauthdire000000001` |
| admin | `admin@aeronexis.local` | Lyon | `clh7seedauthadmin00000001` |

## Clients

| Code | CA annuel | 1er contrat |
|------|-----------|-------------|
| `CLI-001` (Lyon) | 12 500 000 € | 2018-03-15 |
| `CLI-PAR-001` (Paris) | 3 200 000 € | 2022-09-01 |

## Matrice commande ↔ produit ↔ lot

| Commande | Produit ligne | Lot lié | Statut |
|----------|---------------|---------|--------|
| `CMD-2025-00001` | `PROD-004` Bras | `BATCH-SEED-005` | DRAFT |
| `CMD-2025-00002` | `PROD-003` Vérin | `BATCH-SEED-004` | DRAFT + urgent |
| `CMD-2025-00003` | `PROD-002` Plaque | `BATCH-SEED-003` | VALIDATED |
| `CMD-2025-00004` | `PROD-001` Palier | `BATCH-SEED-001` | IN_PRODUCTION |
| `CMD-2025-00005` | `PROD-001` Palier | `BATCH-SEED-002` | DELIVERED |
| `CMD-PAR-00001` | `PROD-PAR-001` | `BATCH-SEED-PAR-001` | DRAFT |

Chaque commande Lyon/Paris porte `carrier`, `deliveryAddress` et `emoji` (`SEED_ORDER_DETAILS`).

## Matrice démo — Ordres de fabrication (`SEED_BOM_CATALOG`)

| Code | Produit | Statut OF | Priorité | Matières | Réservations |
|------|---------|-----------|----------|----------|--------------|
| `BOM-SEED-001` | Palier PN-100 | En cours | Normale | OK | Oui (3 matières) |
| `BOM-SEED-002` | Plaque LP-200 | En attente | Normale | OK | Non |
| `BOM-SEED-003` | Vérin VH-450 | En attente | Haute | Rupture | Non |
| `BOM-SEED-004` | Bras BA-320 | Terminée | Critique | OK | Non |
| `BOM-SEED-PAR-001` | Support TR-450 | En attente | Normale | OK | Non |

## Production — Lots (`SEED_BATCH_SPECS`)

| Lot | BOM | Statut | Avancement | Détail |
|-----|-----|--------|------------|--------|
| `BATCH-SEED-001` | Palier | En cours | ~83 % | **Anomalie ouverte** `ANOMALY-SEED-001` |
| `BATCH-SEED-002` | Palier | Terminé | 100 % | **Anomalie résolue** `ANOMALY-SEED-002` |
| `BATCH-SEED-003` | Plaque | En attente | 0 % | Pick list PENDING |
| `BATCH-SEED-004` | Vérin | En cours | ~50 % | Commande urgente CMD02 |
| `BATCH-SEED-005` | Bras | Terminé | 100 % | CMD01 brouillon |
| `BATCH-SEED-PAR-001` | BOM Paris | En attente | 0 % | Multi-site |

## Stock

- **Lots matière** (`SEED_MATERIAL_LOTS`) : 6 lots (acier, titane, joint, graisse épuisée, Paris)
- **Commandes fournisseur** (`SEED_PURCHASE_ORDERS`) : titane ORDERED, graisse DRAFT, joint PARTIALLY_RECEIVED
- Alerte critique titane Lyon ; graisse rupture ; retard fournisseur AeroMat FR
- 3 réservations ACTIVE sur `BOM-SEED-001` + 1 réservation RELEASED historique

Catalogue Paris : titane, joint, graisse, acier (stocks distincts de Lyon).

## Expéditions

| Code | Statut | Commande | Transporteur |
|------|--------|----------|--------------|
| `SHP-2025-00001` | PLANNED | CMD-2025-00001 | Chronopost Aero |
| `SHP-2025-00002` | IN_TRANSIT | CMD-2025-00004 | FedEx Freight |
| `SHP-2025-00003` | DELIVERED | CMD-2025-00005 | DHL |
| `SHP-PAR-00001` | PLANNED | CMD-PAR-00001 | Colissimo Pro |

Pick lists : 3 COMPLETED + 2 PENDING (`PICK-2025-00004` plaque, `PICK-PAR-00001` Paris).

## Audit (MongoDB)

- ~15 entrées `audit_logs` (tous rôles seed, PO, pick list, Paris)
- 4 `critical_events` (titane, lot retard, fournisseur, rupture graisse)
- `lot_progress_audit` sur les 6 lots
- `event_history` : création lots, réservation, PO, pick list, expédition Paris, anomalie résolue
- 2 `document_attachments` (certificat titane, bon livraison CMD05 — métadonnées seules)

## Notifications (Redis)

10 notifications (`SEED_NOTIFICATIONS`) : 7 Lyon + 3 Paris, mix lu/non lu.

## Parcours par rôle (15 min)

| Rôle | Pages |
|------|-------|
| **operateur** | `/bom` — 4 OF Lyon + scénario rupture vérin ; Paris via site |
| **logistique** | `/inventaire/spare` — lots matière + PO ; `/delivery` — 3 statuts Lyon + pick PENDING + Paris PLANNED |
| **commercial** (Paris) | `/commands` — CMD01 bras / CMD02 vérin cohérents ; emojis transport |
| **direction** | `/dashboard` KPIs Lyon + Paris ; `/activity` trace complète ; `/notifications` |
