# ─────────────────────────────────────────────
# Stage 1 – builder
# ─────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile

RUN pnpm --filter web build

# ─────────────────────────────────────────────
# Stage 2 – runner
# ─────────────────────────────────────────────
FROM node:24-alpine AS runner

ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

WORKDIR /app

COPY --from=builder /app/apps/web/.output ./output

EXPOSE 3000

CMD ["node", "output/server/index.mjs"]
