import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import {
  SEED_BATCHES,
  SEED_CLIENT_PROFILES,
  SEED_CLIENTS,
  SEED_ORDER_DETAILS,
  SEED_ORDERS,
  SEED_PRODUCT_NAMES,
  SEED_PRODUCTS,
  SEED_SITES,
  SEED_USER_IDS
} from "@aeronexis/shared";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = createPrismaClient(PrismaClient, process.env.ORDER_DATABASE_URL);

const ORDER_STATUSES = {
  DRAFT: "DRAFT",
  VALIDATED: "VALIDATED",
  IN_PRODUCTION: "IN_PRODUCTION",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED"
} as const;

type StatusHistoryEntry = {
  fromStatus: string | null;
  toStatus: string;
  changedBy: string;
  notes?: string;
  createdAt?: Date;
};

type OrderSeedData = {
  status: string;
  isUrgent: boolean;
  dueDate?: Date;
  promisedDeliveryDate?: Date;
  carrier?: string;
  deliveryAddress?: string;
  emoji?: string;
  totalAmount: number;
  lines: Array<{
    lineNumber: number;
    productCode: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    ofId?: string;
  }>;
  statusHistory: StatusHistoryEntry[];
  validations?: Array<{ action: string; reason?: string; validatedBy: string }>;
};

async function upsertClient(
  code: string,
  name: string,
  siteCode: string,
  profile: { annualRevenue: number; firstContractDate: string }
) {
  const existing = await prisma.client.findFirst({
    where: { code, deletedAt: null }
  });

  const data = {
    name,
    country: "FR",
    type: "industrial",
    status: "active",
    siteCode,
    annualRevenue: profile.annualRevenue,
    firstContractDate: new Date(profile.firstContractDate)
  };

  if (existing) {
    return prisma.client.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.client.create({
    data: { code, ...data }
  });
}

async function upsertOrder(orderNumber: string, clientId: string, siteCode: string, data: OrderSeedData) {
  const existing = await prisma.customerOrder.findFirst({
    where: { orderNumber, deletedAt: null }
  });

  if (existing) {
    await prisma.customerOrderLine.deleteMany({ where: { orderId: existing.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: existing.id } });
    await prisma.orderValidation.deleteMany({ where: { orderId: existing.id } });
  }

  const orderData = {
    orderNumber,
    clientId,
    siteCode,
    status: data.status,
    isUrgent: data.isUrgent,
    dueDate: data.dueDate,
    promisedDeliveryDate: data.promisedDeliveryDate,
    carrier: data.carrier,
    deliveryAddress: data.deliveryAddress,
    emoji: data.emoji,
    totalAmount: data.totalAmount,
    lines: {
      create: data.lines.map((line) => ({
        lineNumber: line.lineNumber,
        productCode: line.productCode,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        ofId: line.ofId
      }))
    },
    statusHistory: {
      create: data.statusHistory.map((entry) => ({
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        changedBy: entry.changedBy,
        notes: entry.notes,
        ...(entry.createdAt ? { createdAt: entry.createdAt } : {})
      }))
    },
    ...(data.validations?.length
      ? {
          validations: {
            create: data.validations.map((v) => ({
              action: v.action,
              reason: v.reason,
              validatedBy: v.validatedBy
            }))
          }
        }
      : {})
  };

  if (existing) {
    return prisma.customerOrder.update({
      where: { id: existing.id },
      data: orderData
    });
  }

  return prisma.customerOrder.create({ data: orderData });
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function orderDetails(orderNumber: string) {
  return SEED_ORDER_DETAILS[orderNumber as keyof typeof SEED_ORDER_DETAILS];
}

async function main() {
  const client = await upsertClient(
    SEED_CLIENTS.LYO,
    "Aerospace Dynamics SA",
    SEED_SITES.LYO,
    SEED_CLIENT_PROFILES[SEED_CLIENTS.LYO]
  );
  const parisClient = await upsertClient(
    SEED_CLIENTS.PAR,
    "Paris Aero Components",
    SEED_SITES.PAR,
    SEED_CLIENT_PROFILES[SEED_CLIENTS.PAR]
  );

  const promisedDate = daysFromNow(14);
  const urgentDueDate = daysFromNow(3);
  const commercial = SEED_USER_IDS.commercial;

  await upsertOrder(SEED_ORDERS.CMD01, client.id, SEED_SITES.LYO, {
    ...orderDetails(SEED_ORDERS.CMD01),
    status: ORDER_STATUSES.DRAFT,
    isUrgent: false,
    promisedDeliveryDate: promisedDate,
    totalAmount: 185_000,
    lines: [
      {
        lineNumber: 1,
        productCode: SEED_PRODUCTS.BRAS,
        description: SEED_PRODUCT_NAMES[SEED_PRODUCTS.BRAS],
        quantity: 1,
        unitPrice: 185_000,
        ofId: SEED_BATCHES.BRAS_COMPLETED
      }
    ],
    statusHistory: [
      { fromStatus: null, toStatus: ORDER_STATUSES.DRAFT, changedBy: "seed" }
    ]
  });

  await upsertOrder(SEED_ORDERS.CMD02, client.id, SEED_SITES.LYO, {
    ...orderDetails(SEED_ORDERS.CMD02),
    status: ORDER_STATUSES.DRAFT,
    isUrgent: true,
    dueDate: urgentDueDate,
    promisedDeliveryDate: urgentDueDate,
    totalAmount: 270_000,
    lines: [
      {
        lineNumber: 1,
        productCode: SEED_PRODUCTS.VERIN,
        description: SEED_PRODUCT_NAMES[SEED_PRODUCTS.VERIN],
        quantity: 3,
        unitPrice: 90_000,
        ofId: SEED_BATCHES.VERIN_IN_PROGRESS
      }
    ],
    statusHistory: [
      { fromStatus: null, toStatus: ORDER_STATUSES.DRAFT, changedBy: "seed" }
    ]
  });

  await upsertOrder(SEED_ORDERS.CMD03, client.id, SEED_SITES.LYO, {
    ...orderDetails(SEED_ORDERS.CMD03),
    status: ORDER_STATUSES.VALIDATED,
    isUrgent: false,
    promisedDeliveryDate: promisedDate,
    totalAmount: 180_000,
    lines: [
      {
        lineNumber: 1,
        productCode: SEED_PRODUCTS.PLAQUE,
        description: SEED_PRODUCT_NAMES[SEED_PRODUCTS.PLAQUE],
        quantity: 1,
        unitPrice: 180_000,
        ofId: SEED_BATCHES.LYO_PLAQUE_PENDING
      }
    ],
    statusHistory: [
      { fromStatus: null, toStatus: ORDER_STATUSES.DRAFT, changedBy: "seed", createdAt: daysAgo(10) },
      {
        fromStatus: ORDER_STATUSES.DRAFT,
        toStatus: ORDER_STATUSES.VALIDATED,
        changedBy: commercial,
        notes: "Validation commerciale",
        createdAt: daysAgo(8)
      }
    ],
    validations: [{ action: "VALIDATE", validatedBy: commercial }]
  });

  await upsertOrder(SEED_ORDERS.CMD04, client.id, SEED_SITES.LYO, {
    ...orderDetails(SEED_ORDERS.CMD04),
    status: ORDER_STATUSES.IN_PRODUCTION,
    isUrgent: false,
    promisedDeliveryDate: promisedDate,
    totalAmount: 250_000,
    lines: [
      {
        lineNumber: 1,
        productCode: SEED_PRODUCTS.PALIER,
        description: SEED_PRODUCT_NAMES[SEED_PRODUCTS.PALIER],
        quantity: 2,
        unitPrice: 125_000,
        ofId: SEED_BATCHES.LYO_IN_PROGRESS
      }
    ],
    statusHistory: [
      { fromStatus: null, toStatus: ORDER_STATUSES.DRAFT, changedBy: "seed", createdAt: daysAgo(15) },
      {
        fromStatus: ORDER_STATUSES.DRAFT,
        toStatus: ORDER_STATUSES.VALIDATED,
        changedBy: commercial,
        createdAt: daysAgo(12)
      },
      {
        fromStatus: ORDER_STATUSES.VALIDATED,
        toStatus: ORDER_STATUSES.IN_PRODUCTION,
        changedBy: SEED_USER_IDS.operateur,
        notes: "Lancement lot production",
        createdAt: daysAgo(5)
      }
    ],
    validations: [{ action: "VALIDATE", validatedBy: commercial }]
  });

  await upsertOrder(SEED_ORDERS.CMD05, client.id, SEED_SITES.LYO, {
    ...orderDetails(SEED_ORDERS.CMD05),
    status: ORDER_STATUSES.DELIVERED,
    isUrgent: false,
    promisedDeliveryDate: daysAgo(1),
    totalAmount: 320_000,
    lines: [
      {
        lineNumber: 1,
        productCode: SEED_PRODUCTS.PALIER,
        description: SEED_PRODUCT_NAMES[SEED_PRODUCTS.PALIER],
        quantity: 2,
        unitPrice: 160_000,
        ofId: SEED_BATCHES.LYO_COMPLETED
      }
    ],
    statusHistory: [
      { fromStatus: null, toStatus: ORDER_STATUSES.DRAFT, changedBy: "seed", createdAt: daysAgo(30) },
      {
        fromStatus: ORDER_STATUSES.DRAFT,
        toStatus: ORDER_STATUSES.VALIDATED,
        changedBy: commercial,
        createdAt: daysAgo(28)
      },
      {
        fromStatus: ORDER_STATUSES.VALIDATED,
        toStatus: ORDER_STATUSES.IN_PRODUCTION,
        changedBy: SEED_USER_IDS.operateur,
        createdAt: daysAgo(20)
      },
      {
        fromStatus: ORDER_STATUSES.IN_PRODUCTION,
        toStatus: ORDER_STATUSES.SHIPPED,
        changedBy: SEED_USER_IDS.logistique,
        createdAt: daysAgo(5)
      },
      {
        fromStatus: ORDER_STATUSES.SHIPPED,
        toStatus: ORDER_STATUSES.DELIVERED,
        changedBy: SEED_USER_IDS.logistique,
        notes: "Reception client confirmee",
        createdAt: daysAgo(1)
      }
    ],
    validations: [{ action: "VALIDATE", validatedBy: commercial }]
  });

  await upsertOrder(SEED_ORDERS.CMD_PAR, parisClient.id, SEED_SITES.PAR, {
    ...orderDetails(SEED_ORDERS.CMD_PAR),
    status: ORDER_STATUSES.DRAFT,
    isUrgent: false,
    promisedDeliveryDate: promisedDate,
    totalAmount: 45_000,
    lines: [
      {
        lineNumber: 1,
        productCode: SEED_PRODUCTS.PARIS,
        description: SEED_PRODUCT_NAMES[SEED_PRODUCTS.PARIS],
        quantity: 1,
        unitPrice: 45_000,
        ofId: SEED_BATCHES.PAR_PENDING
      }
    ],
    statusHistory: [
      { fromStatus: null, toStatus: ORDER_STATUSES.DRAFT, changedBy: "seed" }
    ]
  });

  console.log("Commande seed completed:", {
    client: client.code,
    parisClient: parisClient.code,
    orders: Object.values(SEED_ORDERS)
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
