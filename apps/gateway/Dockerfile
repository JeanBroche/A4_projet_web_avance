FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.service.json ./
COPY packages/moleculer-config packages/moleculer-config
COPY packages/services-shared packages/services-shared
COPY packages/shared packages/shared
COPY packages/redis-infra packages/redis-infra
COPY apps/gateway apps/gateway

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aeronexis/gateway run build

FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/apps/gateway

EXPOSE 4000

CMD ["pnpm", "start"]
