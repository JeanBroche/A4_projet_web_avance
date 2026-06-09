# expedition

Microservice Moleculer expedition (M6). Gere le picking, la planification, le suivi et l'historique des expeditions.

## Actions Moleculer

| Action | RBAC | Description |
|--------|------|-------------|
| `expedition.ping` | — | Health check |
| `expedition.picklist.create` | logistique | Cree une liste de picking pour une commande |
| `expedition.picklist.complete` | logistique | Finalise le picking |
| `expedition.shipment.plan` | logistique | Planifie une expedition depuis un pick list complete |
| `expedition.shipment.get` | auth | Detail d'une expedition |
| `expedition.shipment.track` | auth | Timeline de tracking |
| `expedition.shipment.updateStatus` | logistique | Transition de statut (PICKED, IN_TRANSIT, DELIVERED…) |
| `expedition.shipment.history` | auth | Historique pagine avec filtres |

## Events

| Topic | Direction | Description |
|-------|-----------|-------------|
| `commande.order.finished` | Consomme | Auto-creation d'un pick list |
| `shipment.planned` | Publie (stub log) | Apres planification |
| `shipment.status.changed` | Publie (stub log) | Apres changement de statut |

## Statuts shipment

`PLANNED` → `PICKED` → `IN_TRANSIT` → `DELIVERED` (ou `CANCELLED`)

## Scripts Prisma (depuis `services/expedition`)

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | Appliquer les migrations (`schema expedition`) |
| `pnpm db:migrate:dev` | Creer / appliquer une migration en dev |
| `pnpm db:seed` | Donnees de reference |
| `pnpm db:studio` | Prisma Studio — <http://localhost:5559> (schema `expedition`) |
| `pnpm db:generate` | Regenerer le client |

## Dev

```bash
pnpm --filter @aeronexis/expedition dev
pnpm --filter @aeronexis/expedition test
pnpm --filter @aeronexis/expedition call:ping
```

```bash
pnpm exec moleculer call expedition.picklist.create \
  --orderNumber CMD-2025-00001 --siteCode SITE-LYO \
  --lines '[{"productCode":"PROD-001","quantity":2}]' \
  --accessToken <jwt>
```
