/** Microservices with Prisma schemas (M1). Order matters for seed. */
export const PRISMA_SERVICES = [
  "@aeronexis/auth",
  "@aeronexis/stock",
  "@aeronexis/order",
  "@aeronexis/production",
  "@aeronexis/shipment"
] as const;

export type PrismaService = (typeof PRISMA_SERVICES)[number];
