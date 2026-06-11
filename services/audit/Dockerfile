FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.service.json ./

COPY packages/moleculer-config ./packages/moleculer-config
COPY packages/services-shared ./packages/services-shared
COPY packages/shared ./packages/shared
COPY packages/redis-infra ./packages/redis-infra
COPY packages/storage ./packages/storage

COPY services/audit services/audit

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aeronexis/audit run build

FROM node:24-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/services/audit

CMD ["pnpm", "start"]
