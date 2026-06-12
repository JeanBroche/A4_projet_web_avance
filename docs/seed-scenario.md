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
| `CMD-2025-00001` | DRAFT | Commercial : valider — lié OF terminé (Bras BA-320) |
| `CMD-2025-00002` | DRAFT + urgent | Priorité — lot vérin en cours |
| `CMD-2025-00003` | VALIDATED | Historique statuts — lot plaque en attente |
| `CMD-2025-00004` | IN_PRODUCTION | Lié `BATCH-SEED-001` (palier + anomalie) |
| `CMD-2025-00005` | DELIVERED | Funnel complet — lot palier terminé |

Paris : `CMD-PAR-00001` (DRAFT).

## Matrice démo — Ordres de fabrication (`SEED_BOM_CATALOG`)

Couvre les combinaisons affichées sur `/bom` :

| Code | Produit | Statut OF | Priorité | Matières | Réservations | Exemple UI |
|------|---------|-----------|----------|----------|--------------|------------|
| `BOM-SEED-001` | Palier haute précision PN-100 | En cours | Normale | Toutes OK | Oui (3 matières) | 2 lots, anomalie QC, bookmark |
| `BOM-SEED-002` | Plaque fixation module embarqué LP-200 | En attente | Normale | Toutes OK | Non | 1 lot à 0 % |
| `BOM-SEED-003` | Vérin hydraulique VH-450 | En attente | Haute | Rupture + insuffisant | Non | Titane insuffisant, graisse rupture |
| `BOM-SEED-004` | Bras articulé BA-320 | Terminée | Critique | Toutes OK | Non | Filtre « Terminée », lot 100 % |

### Détail matières par OF

| OF | Besoins unitaires |
|----|-------------------|
| Palier PN-100 | Acier 316L ×2 kg, Titane ×4 kg, Joint ×8 pcs |
| Plaque LP-200 | Acier ×36 kg, Joint ×12 pcs |
| Vérin VH-450 | Acier ×3 kg, Titane ×10 kg (stock insuffisant), Graisse ×2 kg (rupture) |
| Bras BA-320 | Acier ×8 kg, Joint ×16 pcs |

## Production — Lots (`SEED_BATCH_SPECS`)

| Lot | BOM | Statut | Avancement | Détail |
|-----|-----|--------|------------|--------|
| `BATCH-SEED-001` | Palier | En cours | ~83 % | Prep + fab OK, QC en cours — **anomalie ouverte** |
| `BATCH-SEED-002` | Palier | Terminé | 100 % | 3/3 étapes |
| `BATCH-SEED-003` | Plaque | En attente | 0 % | Aucune étape démarrée |
| `BATCH-SEED-004` | Vérin | En cours | ~50 % | Prep OK, fabrication en cours — sans anomalie |
| `BATCH-SEED-005` | Bras | Terminé | 100 % | OF historique terminé |
| `BATCH-SEED-PAR-001` | Palier | En attente | 0 % | Multi-site Paris |

L'avancement est calculé depuis les étapes (`STEP-01` préparation, `STEP-02` fabrication, `STEP-03` contrôle qualité).

## Stock

- Alerte critique titane (`MAT-002`) : disponible 8 kg < seuil 15 kg
- Graisse (`MAT-004`) : stock 0 kg → rupture sur vérin VH-450
- Retard fournisseur AeroMat FR sur titane
- 3 réservations ACTIVE sur `BOM-SEED-001` (alignées BOM palier)

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
| **operateur** | `/bom`, `/batch` — 4 OF, filtres statut, anomalie + traçabilité |
| **logistique** | `/inventaire/spare`, `/delivery` — réservations + 3 statuts expédition |
| **commercial** | `/commands` — draft/urgent + historique |
| **direction** | `/dashboard`, `/notifications`, `/activity` — KPI + incidents |
