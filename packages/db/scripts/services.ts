/** Microservices with Prisma schemas (M1). Order matters for seed. */
export const PRISMA_SERVICES = [
  "@aeronexis/auth",
  "@aeronexis/stock",
  "@aeronexis/order",
  "@aeronexis/production",
  "@aeronexis/shipment"
] as const;

export type PrismaService = (typeof PRISMA_SERVICES)[number];

/** Additional services with db:seed (no Prisma). */
export const EXTRA_SEED_SERVICES = ["@aeronexis/audit", "@aeronexis/notification"] as const;

export const SEED_SERVICES = [...PRISMA_SERVICES, ...EXTRA_SEED_SERVICES] as const;

export type SeedService = (typeof SEED_SERVICES)[number];
