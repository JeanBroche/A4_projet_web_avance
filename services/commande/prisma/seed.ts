import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = createPrismaClient(PrismaClient, process.env.COMMANDE_DATABASE_URL);

const ORDER_STATUSES = {
  DRAFT: "DRAFT",
  VALIDATED: "VALIDATED"
} as const;

async function upsertClient() {
  const existing = await prisma.client.findFirst({
    where: { code: "CLI-001", deletedAt: null }
  });

  if (existing) {
    return prisma.client.update({
      where: { id: existing.id },
      data: {
        name: "Aerospace Dynamics SA",
        country: "FR",
        type: "industrial",
        status: "active",
        siteCode: "SITE-LYO"
      }
    });
  }

  return prisma.client.create({
    data: {
      code: "CLI-001",
      name: "Aerospace Dynamics SA",
      country: "FR",
      type: "industrial",
      status: "active",
      siteCode: "SITE-LYO"
    }
  });
}

async function upsertParisClient() {
  const existing = await prisma.client.findFirst({
    where: { code: "CLI-PAR-001", deletedAt: null }
  });

  if (existing) {
    return prisma.client.update({
      where: { id: existing.id },
      data: {
        name: "Paris Aero Components",
        country: "FR",
        type: "industrial",
        status: "active",
        siteCode: "SITE-PAR"
      }
    });
  }

  return prisma.client.create({
    data: {
      code: "CLI-PAR-001",
      name: "Paris Aero Components",
      country: "FR",
      type: "industrial",
      status: "active",
      siteCode: "SITE-PAR"
    }
  });
}

async function upsertOrder(
  orderNumber: string,
  clientId: string,
  siteCode: string,
  data: {
    status: string;
    isUrgent: boolean;
    dueDate?: Date;
    promisedDeliveryDate?: Date;
    totalAmount: number;
    lines: Array<{
      lineNumber: number;
      productCode: string;
      description?: string;
      quantity: number;
      unitPrice?: number;
    }>;
  }
) {
  const existing = await prisma.customerOrder.findFirst({
    where: { orderNumber, deletedAt: null }
  });

  if (existing) {
    await prisma.customerOrderLine.deleteMany({ where: { orderId: existing.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: existing.id } });
    await prisma.orderValidation.deleteMany({ where: { orderId: existing.id } });

    const order = await prisma.customerOrder.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        isUrgent: data.isUrgent,
        dueDate: data.dueDate,
        promisedDeliveryDate: data.promisedDeliveryDate,
        totalAmount: data.totalAmount,
        siteCode,
        lines: {
          create: data.lines.map((line) => ({
            lineNumber: line.lineNumber,
            productCode: line.productCode,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice
          }))
        },
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: data.status,
            changedBy: "seed",
            notes: "Seed initial status"
          }
        }
      }
    });

    return order;
  }

  return prisma.customerOrder.create({
    data: {
      orderNumber,
      clientId,
      siteCode,
      status: data.status,
      isUrgent: data.isUrgent,
      dueDate: data.dueDate,
      promisedDeliveryDate: data.promisedDeliveryDate,
      totalAmount: data.totalAmount,
      lines: {
        create: data.lines.map((line) => ({
          lineNumber: line.lineNumber,
          productCode: line.productCode,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice
        }))
      },
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: data.status,
          changedBy: "seed",
          notes: "Seed initial status"
        }
      }
    }
  });
}

async function main() {
  const client = await upsertClient();

  const promisedDate = new Date();
  promisedDate.setDate(promisedDate.getDate() + 14);

  const urgentDueDate = new Date();
  urgentDueDate.setDate(urgentDueDate.getDate() + 3);

  const parisClient = await upsertParisClient();

  await upsertOrder("CMD-2025-00001", client.id, "SITE-LYO", {
    status: ORDER_STATUSES.DRAFT,
    isUrgent: false,
    promisedDeliveryDate: promisedDate,
    totalAmount: 250000,
    lines: [
      {
        lineNumber: 1,
        productCode: "PROD-001",
        description: "Support moteur titane",
        quantity: 2,
        unitPrice: 125000
      }
    ]
  });

  await upsertOrder("CMD-2025-00002", client.id, "SITE-LYO", {
    status: ORDER_STATUSES.DRAFT,
    isUrgent: true,
    dueDate: urgentDueDate,
    promisedDeliveryDate: urgentDueDate,
    totalAmount: 90000,
    lines: [
      {
        lineNumber: 1,
        productCode: "PROD-002",
        description: "Plaque aluminium urgent",
        quantity: 3,
        unitPrice: 30000
      }
    ]
  });

  await upsertOrder("CMD-PAR-00001", parisClient.id, "SITE-PAR", {
    status: ORDER_STATUSES.DRAFT,
    isUrgent: false,
    promisedDeliveryDate: promisedDate,
    totalAmount: 45000,
    lines: [
      {
        lineNumber: 1,
        productCode: "PROD-PAR-001",
        description: "Piece site Paris",
        quantity: 1,
        unitPrice: 45000
      }
    ]
  });

  console.log("Commande seed completed:", {
    client: client.code,
    parisClient: parisClient.code,
    orders: ["CMD-2025-00001", "CMD-2025-00002", "CMD-PAR-00001"]
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
