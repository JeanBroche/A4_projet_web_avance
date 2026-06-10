# shipment

Microservice Moleculer shipment (M6). Gere le picking, la planification, le suivi et l'historique des expeditions.

## Actions Moleculer

| Action | RBAC | Description |
|--------|------|-------------|
| `shipment.ping` | — | Health check |
| `shipment.picklist.create` | logistique | Cree une liste de picking pour une commande |
| `shipment.picklist.complete` | logistique | Finalise le picking |
| `shipment.shipment.plan` | logistique | Planifie une expedition depuis un pick list complete |
| `shipment.shipment.get` | auth | Detail d'une expedition |
| `shipment.shipment.track` | auth | Timeline de tracking |
| `shipment.shipment.updateStatus` | logistique | Transition de statut (PICKED, IN_TRANSIT, DELIVERED…) |
| `shipment.shipment.history` | auth | Historique pagine avec filtres |

## Events

| Topic | Direction | Description |
|-------|-----------|-------------|
| `order.order.finished` | Consomme | Auto-creation d'un pick list |
| `shipment.planned` | Publie (stub log) | Apres planification |
| `shipment.status.changed` | Publie (stub log) | Apres changement de statut |

## Statuts shipment

`PLANNED` → `PICKED` → `IN_TRANSIT` → `DELIVERED` (ou `CANCELLED`)

## Scripts Prisma (depuis `services/shipment`)

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | Appliquer les migrations (`schema shipment`) |
| `pnpm db:migrate:dev` | Creer / appliquer une migration en dev |
| `pnpm db:seed` | Donnees de reference |
| `pnpm db:studio` | Prisma Studio — <http://localhost:5559> (schema `shipment`) |
| `pnpm db:generate` | Regenerer le client |

## Dev

```bash
pnpm --filter @aeronexis/shipment dev
pnpm --filter @aeronexis/shipment test
pnpm --filter @aeronexis/shipment call:ping
```

```bash
pnpm exec moleculer call shipment.picklist.create \
  --orderNumber CMD-2025-00001 --siteCode SITE-LYO \
  --lines '[{"productCode":"PROD-001","quantity":2}]' \
  --accessToken <jwt>
```
