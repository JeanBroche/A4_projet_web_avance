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

  JOINT: "MAT-003",

  GRAISSE: "MAT-004",

  ALU: "MAT-005",

  VIS: "MAT-006"

} as const;



export const SEED_MATERIAL_LABELS = {

  [SEED_MATERIALS.ACIER]: {

    name: "Acier inox 316L — usinage aéronautique",

    unit: "kg"

  },

  [SEED_MATERIALS.TITANE]: {

    name: "Titane Ti-6Al-4V — pièces critiques",

    unit: "kg"

  },

  [SEED_MATERIALS.JOINT]: {

    name: "Joint torique viton — circuit hydraulique",

    unit: "pcs"

  },

  [SEED_MATERIALS.GRAISSE]: {

    name: "Graisse aéronautique Molykote BR-2",

    unit: "kg"

  },

  [SEED_MATERIALS.ALU]: {

    name: "Aluminium 7075-T651 — tôlerie structure",

    unit: "kg"

  },

  [SEED_MATERIALS.VIS]: {

    name: "Vis NAS1352-3-8 — fixation aéronautique",

    unit: "pcs"

  }

} as const;



export const SEED_PRODUCTS = {

  PALIER: "PROD-001",

  PLAQUE: "PROD-002",

  VERIN: "PROD-003",

  BRAS: "PROD-004",

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

  PLAQUE: "BOM-SEED-002",

  VERIN: "BOM-SEED-003",

  BRAS: "BOM-SEED-004"

} as const;



export type SeedBomPriority = "low" | "normal" | "high" | "critical";

export type SeedBomProductionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type SeedMaterialScenario = "ok" | "partial" | "shortage";



/** Matrice démo : statut OF × priorité × matières × lots (voir docs/seed-scenario.md). */

export const SEED_BOM_CATALOG = [

  {

    key: "PALIER",

    bomCode: SEED_BOM.PALIER,

    productCode: SEED_PRODUCTS.PALIER,

    name: "Palier haute précision PN-100",

    summary: "Palier de butée — système hydraulique moteur civil",

    emoji: "⚙️",

    status: "IN_PROGRESS" satisfies SeedBomProductionStatus,

    priority: "normal" satisfies SeedBomPriority,

    quantity: 4,

    siteCode: SEED_SITES.LYO,

    materialScenario: "ok" satisfies SeedMaterialScenario,

    reserveMaterials: true,

    primaryMaterialId: SEED_MATERIALS.ACIER,

    lines: [

      { material_id: SEED_MATERIALS.ACIER, quantity: 1 },

      { material_id: SEED_MATERIALS.TITANE, quantity: 1 },

      { material_id: SEED_MATERIALS.JOINT, quantity: 2 }

    ]

  },

  {

    key: "PLAQUE",

    bomCode: SEED_BOM.PLAQUE,

    productCode: SEED_PRODUCTS.PLAQUE,

    name: "Plaque fixation module embarqué LP-200",

    summary: "Structure module critique — drone longue portée",

    emoji: "🛩️",

    status: "PENDING" satisfies SeedBomProductionStatus,

    priority: "normal" satisfies SeedBomPriority,

    quantity: 12,

    siteCode: SEED_SITES.LYO,

    materialScenario: "ok" satisfies SeedMaterialScenario,

    reserveMaterials: false,

    primaryMaterialId: SEED_MATERIALS.ACIER,

    lines: [

      { material_id: SEED_MATERIALS.ACIER, quantity: 3 },

      { material_id: SEED_MATERIALS.JOINT, quantity: 1 }

    ]

  },

  {

    key: "VERIN",

    bomCode: SEED_BOM.VERIN,

    productCode: SEED_PRODUCTS.VERIN,

    name: "Vérin hydraulique VH-450",

    summary: "Actionneur hydraulique — train d'atterrissage",

    emoji: "🔩",

    status: "PENDING" satisfies SeedBomProductionStatus,

    priority: "high" satisfies SeedBomPriority,

    quantity: 3,

    siteCode: SEED_SITES.LYO,

    materialScenario: "shortage" satisfies SeedMaterialScenario,

    reserveMaterials: false,

    primaryMaterialId: SEED_MATERIALS.TITANE,

    lines: [

      { material_id: SEED_MATERIALS.ACIER, quantity: 1 },

      { material_id: SEED_MATERIALS.TITANE, quantity: 3 },

      { material_id: SEED_MATERIALS.GRAISSE, quantity: 1 }

    ]

  },

  {

    key: "BRAS",

    bomCode: SEED_BOM.BRAS,

    productCode: SEED_PRODUCTS.BRAS,

    name: "Bras articulé BA-320",

    summary: "Bras articulé — cellule A320",

    emoji: "✈️",

    status: "COMPLETED" satisfies SeedBomProductionStatus,

    priority: "critical" satisfies SeedBomPriority,

    quantity: 10,

    siteCode: SEED_SITES.LYO,

    materialScenario: "ok" satisfies SeedMaterialScenario,

    reserveMaterials: false,

    primaryMaterialId: SEED_MATERIALS.ACIER,

    lines: [

      { material_id: SEED_MATERIALS.ACIER, quantity: 1 },

      { material_id: SEED_MATERIALS.JOINT, quantity: 2 }

    ]

  }

] as const;



/** Rétro-compatibilité — consommé par stock / tests. */

export const SEED_BOM_NAMES = Object.fromEntries(

  SEED_BOM_CATALOG.map((entry) => [

    entry.key,

    { name: entry.name, summary: entry.summary, emoji: entry.emoji }

  ])

) as Record<(typeof SEED_BOM_CATALOG)[number]["key"], { name: string; summary: string; emoji: string }>;



export const SEED_BOM_LINES = Object.fromEntries(

  SEED_BOM_CATALOG.map((entry) => [entry.key, entry.lines])

) as Record<(typeof SEED_BOM_CATALOG)[number]["key"], (typeof SEED_BOM_CATALOG)[number]["lines"]>;



export const SEED_BOM_QUANTITIES = Object.fromEntries(

  SEED_BOM_CATALOG.map((entry) => [entry.key, entry.quantity])

) as Record<(typeof SEED_BOM_CATALOG)[number]["key"], number>;



export const SEED_PRODUCT_NAMES = {

  [SEED_PRODUCTS.PALIER]: SEED_BOM_NAMES.PALIER.name,

  [SEED_PRODUCTS.PLAQUE]: SEED_BOM_NAMES.PLAQUE.name,

  [SEED_PRODUCTS.VERIN]: SEED_BOM_NAMES.VERIN.name,

  [SEED_PRODUCTS.BRAS]: SEED_BOM_NAMES.BRAS.name,

  [SEED_PRODUCTS.PARIS]: "Support transmission TR-450"

} as const;



export const SEED_BOM_UI = Object.fromEntries(

  SEED_BOM_CATALOG.map((entry) => [

    entry.bomCode,

    { priority: entry.priority, emoji: entry.emoji }

  ])

) as Record<string, { priority: SeedBomPriority; emoji: string }>;



export const SEED_BATCHES = {

  LYO_IN_PROGRESS: "BATCH-SEED-001",

  LYO_COMPLETED: "BATCH-SEED-002",

  LYO_PLAQUE_PENDING: "BATCH-SEED-003",

  VERIN_IN_PROGRESS: "BATCH-SEED-004",

  BRAS_COMPLETED: "BATCH-SEED-005",

  PAR_PENDING: "BATCH-SEED-PAR-001"

} as const;



export type SeedStepState = "PENDING" | "IN_PROGRESS" | "COMPLETED";



export const SEED_BATCH_SPECS = [

  {

    code: SEED_BATCHES.LYO_IN_PROGRESS,

    bomKey: "PALIER" as const,

    commandId: SEED_ORDERS.CMD04,

    siteCode: SEED_SITES.LYO,

    steps: {

      "STEP-01": "COMPLETED",

      "STEP-02": "COMPLETED",

      "STEP-03": "IN_PROGRESS"

    } satisfies Record<string, SeedStepState>,

    anomaly: true,

    plannedStartAt: "2026-06-10T08:00:00.000Z",

    plannedEndAt: "2026-06-12T17:00:00.000Z"

  },

  {

    code: SEED_BATCHES.LYO_COMPLETED,

    bomKey: "PALIER" as const,

    commandId: SEED_ORDERS.CMD05,

    siteCode: SEED_SITES.LYO,

    steps: {

      "STEP-01": "COMPLETED",

      "STEP-02": "COMPLETED",

      "STEP-03": "COMPLETED"

    } satisfies Record<string, SeedStepState>,

    anomaly: false,

    plannedStartAt: "2026-01-05T08:00:00.000Z",

    plannedEndAt: "2026-01-10T17:00:00.000Z"

  },

  {

    code: SEED_BATCHES.LYO_PLAQUE_PENDING,

    bomKey: "PLAQUE" as const,

    commandId: SEED_ORDERS.CMD03,

    siteCode: SEED_SITES.LYO,

    steps: {} satisfies Record<string, SeedStepState>,

    anomaly: false

  },

  {

    code: SEED_BATCHES.VERIN_IN_PROGRESS,

    bomKey: "VERIN" as const,

    commandId: SEED_ORDERS.CMD02,

    siteCode: SEED_SITES.LYO,

    steps: {

      "STEP-01": "COMPLETED",

      "STEP-02": "IN_PROGRESS",

      "STEP-03": "PENDING"

    } satisfies Record<string, SeedStepState>,

    anomaly: false,

    plannedStartAt: "2026-06-08T08:00:00.000Z",

    plannedEndAt: "2026-06-14T17:00:00.000Z"

  },

  {

    code: SEED_BATCHES.BRAS_COMPLETED,

    bomKey: "BRAS" as const,

    commandId: SEED_ORDERS.CMD01,

    siteCode: SEED_SITES.LYO,

    steps: {

      "STEP-01": "COMPLETED",

      "STEP-02": "COMPLETED",

      "STEP-03": "COMPLETED"

    } satisfies Record<string, SeedStepState>,

    anomaly: false,

    plannedStartAt: "2025-11-01T08:00:00.000Z",

    plannedEndAt: "2025-11-05T17:00:00.000Z"

  },

  {

    code: SEED_BATCHES.PAR_PENDING,

    bomKey: "PALIER" as const,

    commandId: SEED_ORDERS.CMD_PAR,

    siteCode: SEED_SITES.PAR,

    steps: {} satisfies Record<string, SeedStepState>,

    anomaly: false

  }

] as const;



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


