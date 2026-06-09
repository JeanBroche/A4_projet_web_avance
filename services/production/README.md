# production

Microservice Moleculer production. Implementation prevue : [issue #5](https://github.com/JeanBroche/A4_projet_web_avance/issues/5).

## Scripts Prisma (depuis `services/production`)

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | Appliquer les migrations (`schema production`) |
| `pnpm db:migrate:dev` | Creer / appliquer une migration en dev |
| `pnpm db:seed` | Donnees de reference |
| `pnpm db:studio` | Prisma Studio — http://localhost:5558 (schema `production`) |
| `pnpm db:generate` | Regenerer le client |
