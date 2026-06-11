FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.service.json ./

COPY packages/moleculer-config ./packages/moleculer-config
COPY packages/db ./packages/db
COPY packages/services-shared ./packages/services-shared
COPY packages/shared ./packages/shared
COPY packages/redis-infra ./packages/redis-infra

COPY services/shipment ./services/shipment

RUN pnpm install --frozen-lockfile

ENV SHIPMENT_DATABASE_URL=postgresql://aeronexis:aeronexis_dev@localhost:5432/aeronexis_shipment

RUN pnpm --filter @aeronexis/shipment run build

FROM node:24-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

ENV SHIPMENT_DATABASE_URL=postgresql://aeronexis:aeronexis_dev@localhost:5432/aeronexis_shipment

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/services/shipment

CMD ["pnpm", "start"]
