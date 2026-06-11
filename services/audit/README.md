# audit

Microservice Moleculer audit (M7) : tracabilite lot, journalisation evenements critiques, historique modifications, stockage documentaire (MinIO + MongoDB).

## Persistance

| Store | Collections |
|-------|-------------|
| MongoDB | `audit_logs`, `event_history`, `critical_events`, `lot_progress_audit`, `document_attachments` |
| MinIO | Bucket `aeronexis-docs` (fichiers binaires) |

Pas de Prisma. Les producteurs emettent `user.action.logged` via le broker Moleculer ; le service audit consomme cet evenement et persiste dans MongoDB.

## Actions

| Action | Role | Description |
|--------|------|-------------|
| `audit.ping` | — | Health check |
| `audit.change.list` | admin | Historique modifications (qui / quand / quoi) |
| `audit.event.record` | admin | Enregistrement evenement CRITICAL/WARNING |
| `audit.event.listCritical` | admin | Liste des evenements critiques |
| `audit.lot.trace` | admin | Timeline lot cross-modules (stock, shipment, production) |
| `audit.lot.export` | admin | Export CSV de la timeline lot |
| `audit.document.upload` | production, logistique, admin | PJ lot → MinIO + Mongo |
| `audit.document.list` | production, logistique, admin | Liste PJ d'un lot |
| `audit.document.url` | production, logistique, admin | URL pre-signee de telechargement lot |
| `audit.siteDocument.upload` | admin | Certificat ou PJ site → MinIO + Mongo |
| `audit.siteDocument.get` | authentifie | Recuperation document site (contenu base64) |

## Evenements

| Evenement | Direction | Description |
|-----------|-----------|-------------|
| `user.action.logged` | Consomme | Ecriture dans `audit_logs` |
| `incident.reported` | Publie | Apres enregistrement evenement critique |
| `production.batch.*`, `stock.*`, `shipment.*`, etc. | Consomme | Trace lot temps reel |

## Scripts

```bash
pnpm --filter @aeronexis/audit dev
pnpm --filter @aeronexis/audit seed
pnpm --filter @aeronexis/audit test
pnpm --filter @aeronexis/audit smoke
```

## Appels manuels

```bash
pnpm exec moleculer call audit.change.list --accessToken <jwt> -c moleculer.config.ts
pnpm exec moleculer call audit.lot.trace --accessToken <jwt> --lotId LOT-2026-00001 -c moleculer.config.ts
pnpm exec moleculer call audit.siteDocument.upload --accessToken <jwt> --siteCode SITE-LYO --filename cert.pdf --contentType application/pdf --contentBase64 <base64> --category certificat -c moleculer.config.ts
```

Implementation : [issue #104](https://github.com/JeanBroche/A4_projet_web_avance/issues/104), stockage site [issue #10](https://github.com/JeanBroche/A4_projet_web_avance/issues/10)
