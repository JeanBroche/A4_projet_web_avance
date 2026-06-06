# audit

Microservice Moleculer audit (tracabilite, historique actions).

## Persistance

| Milestone | Store | Usage |
|-----------|-------|-------|
| M0 #9 | MongoDB | Collections `audit_logs`, `event_history` |

**M1** : pas de Prisma. Consommation Kafka (`user.action.logged`) et ecriture MongoDB.

Implementation prevue : [issue #9](https://github.com/JeanBroche/A4_projet_web_avance/issues/9).
