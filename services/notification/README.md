# notification

Microservice Moleculer notification (alertes, emails, in-app).

## Persistance

| Milestone | Store | Usage |
|-----------|-------|-------|
| M1+ | Redis | Etat des notifications, cache regles |
| M1+ | Kafka | Consommation `stock.material.low`, `shipment.delivery.alert`, etc. |

**M1** : pas de Prisma PostgreSQL. Pas inclus dans `pnpm db:migrate`.

Implementation prevue : milestone dedie notification.
