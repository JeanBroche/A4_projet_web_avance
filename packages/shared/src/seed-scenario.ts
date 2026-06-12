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

  BRAS: "BOM-SEED-004",

  PARIS: "BOM-SEED-PAR-001"

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

  },

  {

    key: "PARIS",

    bomCode: SEED_BOM.PARIS,

    productCode: SEED_PRODUCTS.PARIS,

    name: "Support transmission TR-450",

    summary: "Pièce assemblage — site Paris",

    emoji: "🗼",

    status: "PENDING" satisfies SeedBomProductionStatus,

    priority: "normal" satisfies SeedBomPriority,

    quantity: 2,

    siteCode: SEED_SITES.PAR,

    materialScenario: "ok" satisfies SeedMaterialScenario,

    reserveMaterials: false,

    primaryMaterialId: SEED_MATERIALS.ACIER,

    lines: [

      { material_id: SEED_MATERIALS.ACIER, quantity: 2 },

      { material_id: SEED_MATERIALS.JOINT, quantity: 1 }

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

    resolvedAnomaly: true,

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

    bomKey: "PARIS" as const,

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



export const SEED_ANOMALY_RESOLVED = {

  CODE: "ANOMALY-SEED-002",

  ID: "clh7seedanomaly000000002"

} as const;



export const SEED_SHIPMENTS = {

  PLANNED: "SHP-2025-00001",

  IN_TRANSIT: "SHP-2025-00002",

  DELIVERED: "SHP-2025-00003",

  PAR_PLANNED: "SHP-PAR-00001"

} as const;



export const SEED_PICKLISTS = {

  PLANNED: "seed-picklist-001",

  IN_TRANSIT: "seed-picklist-002",

  DELIVERED: "seed-picklist-003",

  PENDING: "seed-picklist-004",

  PAR_PLANNED: "seed-picklist-par-001"

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

    siteCode: SEED_SITES.PAR

  },

  direction: {

    email: "direction@aeronexis.local",

    firstName: "Direction",

    lastName: "Aeronexis",

    siteCode: SEED_SITES.LYO

  }

};



export const SEED_OF_ID = SEED_BATCHES.LYO_IN_PROGRESS;



export const SEED_CLIENT_PROFILES = {

  [SEED_CLIENTS.LYO]: {

    annualRevenue: 12_500_000,

    firstContractDate: "2018-03-15"

  },

  [SEED_CLIENTS.PAR]: {

    annualRevenue: 3_200_000,

    firstContractDate: "2022-09-01"

  }

} as const;



export const SEED_ORDER_DETAILS = {

  [SEED_ORDERS.CMD01]: {

    carrier: "Chronopost Aero",

    deliveryAddress: "12 rue de l'Aviation, 69007 Lyon",

    emoji: "📦"

  },

  [SEED_ORDERS.CMD02]: {

    carrier: "DHL Express",

    deliveryAddress: "Zone fret Satolas, 69125 Lyon Saint-Exupéry",

    emoji: "✈️"

  },

  [SEED_ORDERS.CMD03]: {

    carrier: "Geodis",

    deliveryAddress: "Parc industriel Gerland, 69007 Lyon",

    emoji: "🚛"

  },

  [SEED_ORDERS.CMD04]: {

    carrier: "FedEx Freight",

    deliveryAddress: "Aerospace Dynamics SA, 69007 Lyon",

    emoji: "📦"

  },

  [SEED_ORDERS.CMD05]: {

    carrier: "DHL",

    deliveryAddress: "Aerospace Dynamics SA — quai réception B, 69007 Lyon",

    emoji: "✅"

  },

  [SEED_ORDERS.CMD_PAR]: {

    carrier: "Colissimo Pro",

    deliveryAddress: "Paris Aero Components, 75015 Paris",

    emoji: "🗼"

  }

} as const;



export const SEED_MATERIAL_LOTS = [

  {

    lotNumber: "LOT-ACIER-2024-018",

    materialCode: SEED_MATERIALS.ACIER,

    siteCode: SEED_SITES.LYO,

    supplier: "MetalSupply SA",

    certificateRef: "CERT-ACIER-2024-018",

    quantity: 50,

    remainingQty: 35,

    status: "ACTIVE"

  },

  {

    lotNumber: "LOT-TI-2024-007",

    materialCode: SEED_MATERIALS.TITANE,

    siteCode: SEED_SITES.LYO,

    supplier: "AeroMat FR",

    certificateRef: "CERT-TI-2024-007",

    quantity: 20,

    remainingQty: 8,

    status: "ACTIVE"

  },

  {

    lotNumber: "LOT-JOINT-2025-003",

    materialCode: SEED_MATERIALS.JOINT,

    siteCode: SEED_SITES.LYO,

    supplier: "SealTech",

    certificateRef: "CERT-JOINT-2025-003",

    quantity: 200,

    remainingQty: 180,

    status: "ACTIVE"

  },

  {

    lotNumber: "LOT-GRAISSE-2023-011",

    materialCode: SEED_MATERIALS.GRAISSE,

    siteCode: SEED_SITES.LYO,

    supplier: "Lubricants Aero",

    quantity: 10,

    remainingQty: 0,

    status: "DEPLETED"

  },

  {

    lotNumber: "LOT-TI-PAR-2025-001",

    materialCode: SEED_MATERIALS.TITANE,

    siteCode: SEED_SITES.PAR,

    supplier: "AeroMat FR",

    certificateRef: "CERT-TI-PAR-2025-001",

    quantity: 8,

    remainingQty: 6,

    status: "ACTIVE"

  },

  {

    lotNumber: "LOT-ACIER-PAR-2025-002",

    materialCode: SEED_MATERIALS.ACIER,

    siteCode: SEED_SITES.PAR,

    supplier: "MetalSupply SA",

    quantity: 30,

    remainingQty: 28,

    status: "ACTIVE"

  }

] as const;



export const SEED_PURCHASE_ORDERS = [

  {

    poNumber: "PO-2025-TI-001",

    materialCode: SEED_MATERIALS.TITANE,

    siteCode: SEED_SITES.LYO,

    supplier: "AeroMat FR",

    quantity: 25,

    receivedQty: 0,

    status: "ORDERED",

    expectedDate: "2026-06-20",

    notes: "Commande urgente — retard fournisseur en cours"

  },

  {

    poNumber: "PO-2025-GR-001",

    materialCode: SEED_MATERIALS.GRAISSE,

    siteCode: SEED_SITES.LYO,

    supplier: "Lubricants Aero",

    quantity: 15,

    receivedQty: 0,

    status: "DRAFT",

    notes: "Brouillon — rupture graisse VH-450"

  },

  {

    poNumber: "PO-2025-JOINT-002",

    materialCode: SEED_MATERIALS.JOINT,

    siteCode: SEED_SITES.LYO,

    supplier: "SealTech",

    quantity: 100,

    receivedQty: 60,

    status: "PARTIALLY_RECEIVED",

    expectedDate: "2026-06-05",

    receivedDate: "2026-06-01"

  }

] as const;



export const SEED_SHIPMENT_DETAILS = {

  [SEED_SHIPMENTS.PLANNED]: {

    carrier: "Chronopost Aero",

    deliveryAddress: "12 rue de l'Aviation, 69007 Lyon",

    emoji: "📦",

    plannedShipDate: "2026-06-18",

    plannedDeliveryDate: "2026-06-22"

  },

  [SEED_SHIPMENTS.IN_TRANSIT]: {

    carrier: "FedEx Freight",

    deliveryAddress: "Aerospace Dynamics SA, 69007 Lyon",

    emoji: "🚚",

    plannedShipDate: "2026-06-10",

    plannedDeliveryDate: "2026-06-14"

  },

  [SEED_SHIPMENTS.DELIVERED]: {

    carrier: "DHL",

    deliveryAddress: "Aerospace Dynamics SA — quai réception B, 69007 Lyon",

    emoji: "✅",

    plannedShipDate: "2026-01-08",

    plannedDeliveryDate: "2026-01-12"

  },

  [SEED_SHIPMENTS.PAR_PLANNED]: {

    carrier: "Colissimo Pro",

    deliveryAddress: "Paris Aero Components, 75015 Paris",

    emoji: "🗼",

    plannedShipDate: "2026-06-25",

    plannedDeliveryDate: "2026-06-28"

  }

} as const;



export const SEED_PICK_LIST_VARIANTS = [

  {

    id: SEED_PICKLISTS.PLANNED,

    code: "PICK-2025-00001",

    orderNumber: SEED_ORDERS.CMD01,

    clientCode: SEED_CLIENTS.LYO,

    siteCode: SEED_SITES.LYO,

    status: "COMPLETED",

    ofId: SEED_BATCHES.BRAS_COMPLETED,

    productCode: SEED_PRODUCTS.BRAS,

    quantity: 1

  },

  {

    id: SEED_PICKLISTS.IN_TRANSIT,

    code: "PICK-2025-00002",

    orderNumber: SEED_ORDERS.CMD04,

    clientCode: SEED_CLIENTS.LYO,

    siteCode: SEED_SITES.LYO,

    status: "COMPLETED",

    ofId: SEED_BATCHES.LYO_IN_PROGRESS,

    productCode: SEED_PRODUCTS.PALIER,

    quantity: 2

  },

  {

    id: SEED_PICKLISTS.DELIVERED,

    code: "PICK-2025-00003",

    orderNumber: SEED_ORDERS.CMD05,

    clientCode: SEED_CLIENTS.LYO,

    siteCode: SEED_SITES.LYO,

    status: "COMPLETED",

    ofId: SEED_BATCHES.LYO_COMPLETED,

    productCode: SEED_PRODUCTS.PALIER,

    quantity: 2

  },

  {

    id: SEED_PICKLISTS.PENDING,

    code: "PICK-2025-00004",

    orderNumber: SEED_ORDERS.CMD03,

    clientCode: SEED_CLIENTS.LYO,

    siteCode: SEED_SITES.LYO,

    status: "PENDING",

    ofId: SEED_BATCHES.LYO_PLAQUE_PENDING,

    productCode: SEED_PRODUCTS.PLAQUE,

    quantity: 1,

    pickedQty: 0

  },

  {

    id: SEED_PICKLISTS.PAR_PLANNED,

    code: "PICK-PAR-00001",

    orderNumber: SEED_ORDERS.CMD_PAR,

    clientCode: SEED_CLIENTS.PAR,

    siteCode: SEED_SITES.PAR,

    status: "PENDING",

    ofId: SEED_BATCHES.PAR_PENDING,

    productCode: SEED_PRODUCTS.PARIS,

    quantity: 1,

    pickedQty: 0

  }

] as const;



export const SEED_AUDIT_DOCUMENTS = [

  {

    id: "seed-doc-titane-cert",

    lotId: "LOT-TI-2024-007",

    filename: "certificat-titane-LOT-TI-2024-007.pdf",

    contentType: "application/pdf",

    objectKey: "seed/lots/LOT-TI-2024-007/certificat-titane.pdf",

    sizeBytes: 204_800,

    uploadedBy: SEED_USER_IDS.logistique

  },

  {

    id: "seed-doc-bl-cmd05",

    lotId: SEED_BATCHES.LYO_COMPLETED,

    filename: "bon-livraison-CMD-2025-00005.pdf",

    contentType: "application/pdf",

    objectKey: "seed/shipments/SHP-2025-00003/bon-livraison.pdf",

    sizeBytes: 98_304,

    uploadedBy: SEED_USER_IDS.logistique

  }

] as const;



export const SEED_NOTIFICATIONS = [

  {

    id: "seed-notif-001",

    type: "stock.material.low",

    severity: "CRITICAL" as const,

    title: "Rupture ou seuil stock",

    message: `Stock ${SEED_MATERIALS.TITANE} sous le seuil minimum sur Lyon`,

    siteCode: SEED_SITES.LYO,

    read: false,

    payload: { materialCode: SEED_MATERIALS.TITANE },

    dedup: "seed:stock-low-lyo"

  },

  {

    id: "seed-notif-002",

    type: "stock.supplier.delay",

    severity: "WARNING" as const,

    title: "Retard fournisseur",

    message: "Retard AeroMat FR sur livraison titane grade 5",

    siteCode: SEED_SITES.LYO,

    read: true,

    payload: { supplier: "AeroMat FR", materialCode: SEED_MATERIALS.TITANE },

    dedup: "seed:supplier-delay-lyo"

  },

  {

    id: "seed-notif-003",

    type: "shipment.delivery.alert",

    severity: "WARNING" as const,

    title: "Retard livraison",

    message: `Expedition ${SEED_SHIPMENTS.IN_TRANSIT} en transit avec risque de retard`,

    siteCode: SEED_SITES.LYO,

    read: false,

    payload: { shipmentCode: SEED_SHIPMENTS.IN_TRANSIT, orderNumber: SEED_ORDERS.CMD04 },

    dedup: "seed:shipment-delay-lyo"

  },

  {

    id: "seed-notif-004",

    type: "production.batch.anomaly",

    severity: "WARNING" as const,

    title: "Anomalie lot production",

    message: `Anomalie ouverte sur lot ${SEED_BATCHES.LYO_IN_PROGRESS} (${SEED_ANOMALY.CODE})`,

    siteCode: SEED_SITES.LYO,

    read: false,

    payload: { lotId: SEED_BATCHES.LYO_IN_PROGRESS, anomalyCode: SEED_ANOMALY.CODE },

    dedup: "seed:batch-anomaly-lyo"

  },

  {

    id: "seed-notif-005",

    type: "order.draft",

    severity: "INFO" as const,

    title: "Nouvelle commande Paris",

    message: `Commande brouillon ${SEED_ORDERS.CMD_PAR} en attente sur le site Paris`,

    siteCode: SEED_SITES.PAR,

    read: false,

    payload: { orderNumber: SEED_ORDERS.CMD_PAR },

    dedup: "seed:order-par"

  },

  {

    id: "seed-notif-006",

    type: "stock.purchase_order.created",

    severity: "INFO" as const,

    title: "Commande fournisseur titane",

    message: `PO ${SEED_PURCHASE_ORDERS[0].poNumber} commandée — retard fournisseur`,

    siteCode: SEED_SITES.LYO,

    read: true,

    payload: { poNumber: SEED_PURCHASE_ORDERS[0].poNumber },

    dedup: "seed:po-titane-lyo"

  },

  {

    id: "seed-notif-007",

    type: "shipment.picklist.pending",

    severity: "INFO" as const,

    title: "Préparation en cours",

    message: `Pick list PICK-2025-00004 en attente pour ${SEED_ORDERS.CMD03}`,

    siteCode: SEED_SITES.LYO,

    read: false,

    payload: { pickListCode: "PICK-2025-00004", orderNumber: SEED_ORDERS.CMD03 },

    dedup: "seed:pick-pending-lyo"

  },

  {

    id: "seed-notif-008",

    type: "shipment.planned",

    severity: "INFO" as const,

    title: "Expédition Paris planifiée",

    message: `Expédition ${SEED_SHIPMENTS.PAR_PLANNED} planifiée pour ${SEED_ORDERS.CMD_PAR}`,

    siteCode: SEED_SITES.PAR,

    read: false,

    payload: { shipmentCode: SEED_SHIPMENTS.PAR_PLANNED, orderNumber: SEED_ORDERS.CMD_PAR },

    dedup: "seed:shipment-par"

  },

  {

    id: "seed-notif-009",

    type: "production.anomaly.resolved",

    severity: "INFO" as const,

    title: "Anomalie résolue",

    message: `Anomalie ${SEED_ANOMALY_RESOLVED.CODE} clôturée sur lot ${SEED_BATCHES.LYO_COMPLETED}`,

    siteCode: SEED_SITES.LYO,

    read: true,

    payload: { lotId: SEED_BATCHES.LYO_COMPLETED, anomalyCode: SEED_ANOMALY_RESOLVED.CODE },

    dedup: "seed:anomaly-resolved-lyo"

  },

  {

    id: "seed-notif-010",

    type: "order.urgent",

    severity: "WARNING" as const,

    title: "Commande urgente",

    message: `Commande ${SEED_ORDERS.CMD02} marquée urgente — vérin VH-450`,

    siteCode: SEED_SITES.LYO,

    read: false,

    payload: { orderNumber: SEED_ORDERS.CMD02, isUrgent: true },

    dedup: "seed:order-urgent-lyo"

  }

] as const;


