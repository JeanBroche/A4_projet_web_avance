# Microservice Notification

Boîte de réception logistique alimentée par événements domaine (retards, ruptures stock).

## Actions

| Action | Rôle | Description |
|--------|------|-------------|
| `notification.ping` | public | Healthcheck |
| `notification.inbox.list` | logistique, direction | Liste paginée (Redis ou mémoire si Redis absent) |
| `notification.inbox.markRead` | logistique, direction | Marque une notification lue |
| `notification.inbox.unreadCount` | logistique, direction | Compteur non lues |

## Événements consommés

| Topic | Producteur | Cas métier |
|-------|------------|------------|
| `stock.material.low` | Stock | Rupture (`available <= 0`) ou seuil minimum |
| `stock.supplier.delay.reported` | Stock | Retard fournisseur déclaré |
| `shipment.delivery.alert` | Shipment | Expédition au-delà de la date planifiée |

## Persistance

Inbox Redis : clé `notification:inbox:{siteCode}` (liste JSON, max 500 entrées). Déduplication horaire via `notification:dedup:{siteCode}:{key}`.

Sans `REDIS_URL`, fallback mémoire (tests locaux).

## Scripts

```bash
pnpm --filter @aeronexis/notification dev
pnpm --filter @aeronexis/notification test
```

## Exemple

```bash
pnpm exec moleculer call notification.inbox.list --accessToken <jwt> --siteCode SITE-LYO -c moleculer.config.ts
```
