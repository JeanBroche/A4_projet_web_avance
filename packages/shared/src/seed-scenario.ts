/** Stable identifiers shared across microservice seeds (AERONEXIS demo scenario). */

export const SEED_SITES = {
  LYO: "SITE-LYO",
  PAR: "SITE-PAR"
} as const;

export type SeedSiteCode = (typeof SEED_SITES)[keyof typeof SEED_SITES];

export const SEED_CLIENTS = {
  LYO: "CLI-001",
  PAR: "CLI-PAR-001"
} as const;

export const SEED_MATERIALS = {
  ACIER: "MAT-001",
  TITANE: "MAT-002",
  JOINT: "MAT-003"
} as const;

export const SEED_PRODUCTS = {
  PALIER: "PROD-001",
  PLAQUE: "PROD-002",
  PARIS: "PROD-PAR-001"
} as const;

export const SEED_ORDERS = {
  CMD01: "CMD-2025-00001",
  CMD02: "CMD-2025-00002",
  CMD03: "CMD-2025-00003",
  CMD04: "CMD-2025-00004",
  CMD05: "CMD-2025-00005",
  CMD_PAR: "CMD-PAR-00001"
} as const;

export const SEED_BOM = {
  PALIER: "BOM-SEED-001",
  PLAQUE: "BOM-SEED-002"
} as const;

export const SEED_BATCHES = {
  LYO_IN_PROGRESS: "BATCH-SEED-001",
  LYO_COMPLETED: "BATCH-SEED-002",
  PAR_PENDING: "BATCH-SEED-PAR-001"
} as const;

export const SEED_ANOMALY = {
  CODE: "ANOMALY-SEED-001",
  ID: "clh7seedanomaly000000001"
} as const;

export const SEED_SHIPMENTS = {
  PLANNED: "SHP-2025-00001",
  IN_TRANSIT: "SHP-2025-00002",
  DELIVERED: "SHP-2025-00003"
} as const;

export const SEED_PICKLISTS = {
  PLANNED: "seed-picklist-001",
  IN_TRANSIT: "seed-picklist-002",
  DELIVERED: "seed-picklist-003"
} as const;

/** Fixed CUIDs for cross-service audit correlation. */
export const SEED_USER_IDS = {
  admin: "clh7seedauthadmin00000001",
  operateur: "clh7seedauthoper000000001",
  logistique: "clh7seedauthlogi000000001",
  commercial: "clh7seedauthcomm000000001",
  direction: "clh7seedauthdire000000001"
} as const;

export type SeedUserRole = keyof typeof SEED_USER_IDS;

export const SEED_USERS: Record<
  SeedUserRole,
  { email: string; firstName: string; lastName: string; siteCode: SeedSiteCode }
> = {
  admin: {
    email: "admin@aeronexis.local",
    firstName: "Admin",
    lastName: "Aeronexis",
    siteCode: SEED_SITES.LYO
  },
  operateur: {
    email: "operateur@aeronexis.local",
    firstName: "Operateur",
    lastName: "Production",
    siteCode: SEED_SITES.LYO
  },
  logistique: {
    email: "logistique@aeronexis.local",
    firstName: "Logistique",
    lastName: "Aeronexis",
    siteCode: SEED_SITES.LYO
  },
  commercial: {
    email: "commercial@aeronexis.local",
    firstName: "Commercial",
    lastName: "Aeronexis",
    siteCode: SEED_SITES.LYO
  },
  direction: {
    email: "direction@aeronexis.local",
    firstName: "Direction",
    lastName: "Aeronexis",
    siteCode: SEED_SITES.LYO
  }
};

export const SEED_OF_ID = SEED_BATCHES.LYO_IN_PROGRESS;
