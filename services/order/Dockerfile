FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.service.json ./

COPY packages/moleculer-config ./packages/moleculer-config
COPY packages/db ./packages/db
COPY packages/services-shared ./packages/services-shared
COPY packages/shared ./packages/shared
COPY packages/redis-infra ./packages/redis-infra

COPY services/order ./services/order

RUN pnpm install --frozen-lockfile

ENV ORDER_DATABASE_URL=postgresql://aeronexis:aeronexis_dev@localhost:5432/aeronexis_order

RUN pnpm --filter @aeronexis/order run build

FROM node:24-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
  
ENV ORDER_DATABASE_URL="postgresql://aeronexis:aeronexis_dev@postgres-order:5432/aeronexis_order"

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/services/order

CMD ["pnpm", "start"]
