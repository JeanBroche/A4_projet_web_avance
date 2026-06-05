# reporting

Microservice Moleculer reporting (KPI, tableaux de bord direction).

## Persistance

| Milestone | Store | Schema |
|-----------|-------|--------|
| M7 | PostgreSQL | `reporting` — `KPI_Dashboard`, agregats |

**M1** : pas de schema Prisma ni migration. Les KPI seront alimentes par evenements Kafka et lectures cross-MS.

Implementation prevue : milestone M7 / [issue #53](https://github.com/JeanBroche/A4_projet_web_avance/issues/53).
