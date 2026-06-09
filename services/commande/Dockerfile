FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.service.json ./
COPY packages/moleculer-config packages/moleculer-config
COPY packages/db packages/db
COPY packages/services-shared packages/services-shared
COPY services/commande services/commande

RUN pnpm install --frozen-lockfile
ENV COMMANDE_DATABASE_URL=postgresql://aeronexis:aeronexis_dev@localhost:5432/aeronexis_commande
RUN pnpm --filter @aeronexis/commande run build

FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/services/commande

CMD ["pnpm", "start"]
