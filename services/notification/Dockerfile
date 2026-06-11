FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.service.json ./
COPY packages/moleculer-config packages/moleculer-config
COPY packages/services-shared packages/services-shared
COPY packages/redis-infra packages/redis-infra
COPY services/notification services/notification

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @aeronexis/notification run build

FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

WORKDIR /app/services/notification

CMD ["pnpm", "start"]
