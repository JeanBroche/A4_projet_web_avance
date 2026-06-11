import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import {
  SEED_BATCHES,
  SEED_CLIENTS,
  SEED_ORDERS,
  SEED_PICKLISTS,
  SEED_PRODUCTS,
  SEED_SHIPMENTS,
  SEED_SITES
} from "@aeronexis/shared";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
const prisma = createPrismaClient(PrismaClient, process.env.SHIPMENT_DATABASE_URL);

type PickListSeed = {
  id: string;
  code: string;
  orderNumber: string;
  clientCode: string;
  siteCode: string;
  status: string;
  ofId: string;
  productCode: string;
  quantity: number;
};

const PICK_LISTS: PickListSeed[] = [
  {
    id: SEED_PICKLISTS.PLANNED,
    code: "PICK-2025-00001",
    orderNumber: SEED_ORDERS.CMD01,
    clientCode: SEED_CLIENTS.LYO,
    siteCode: SEED_SITES.LYO,
    status: "COMPLETED",
    ofId: SEED_BATCHES.LYO_IN_PROGRESS,
    productCode: SEED_PRODUCTS.PALIER,
    quantity: 2
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
  }
];

type ShipmentSeed = {
  code: string;
  pickListId: string;
  status: string;
  tracking: Array<{ fromStatus: string | null; toStatus: string; notes: string; createdAt?: Date }>;
  shippedAt?: Date;
  deliveredAt?: Date;
};

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function upsertPickList(seed: PickListSeed) {
  const pickList = await prisma.pickList.upsert({
    where: { id: seed.id },
    update: {
      code: seed.code,
      orderNumber: seed.orderNumber,
      clientCode: seed.clientCode,
      siteCode: seed.siteCode,
      status: seed.status,
      ofId: seed.ofId
    },
    create: {
      id: seed.id,
      code: seed.code,
      orderNumber: seed.orderNumber,
      clientCode: seed.clientCode,
      siteCode: seed.siteCode,
      status: seed.status,
      ofId: seed.ofId,
      lines: {
        create: [
          {
            lineNumber: 1,
            productCode: seed.productCode,
            quantity: seed.quantity,
            pickedQty: seed.quantity
          }
        ]
      }
    },
    include: { lines: true }
  });

  if (pickList.lines.length === 0) {
    await prisma.pickListLine.create({
      data: {
        pickListId: pickList.id,
        lineNumber: 1,
        productCode: seed.productCode,
        quantity: seed.quantity,
        pickedQty: seed.quantity
      }
    });
  }

  return pickList;
}

async function upsertShipment(seed: ShipmentSeed, pickList: { orderNumber: string; clientCode: string | null; siteCode: string }) {
  const existing = await prisma.shipment.findFirst({
    where: { code: seed.code, deletedAt: null }
  });

  if (existing) {
    await prisma.shipmentTrackingEvent.deleteMany({ where: { shipmentId: existing.id } });
    await prisma.shipment.update({
      where: { id: existing.id },
      data: {
        pickListId: seed.pickListId,
        orderNumber: pickList.orderNumber,
        clientCode: pickList.clientCode,
        siteCode: pickList.siteCode,
        status: seed.status,
        shippedAt: seed.shippedAt,
        deliveredAt: seed.deliveredAt,
        trackingEvents: {
          create: seed.tracking.map((event) => ({
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
            notes: event.notes,
            ...(event.createdAt ? { createdAt: event.createdAt } : {})
          }))
        }
      }
    });
    return;
  }

  await prisma.shipment.create({
    data: {
      code: seed.code,
      pickListId: seed.pickListId,
      orderNumber: pickList.orderNumber,
      clientCode: pickList.clientCode,
      siteCode: pickList.siteCode,
      status: seed.status,
      shippedAt: seed.shippedAt,
      deliveredAt: seed.deliveredAt,
      trackingEvents: {
        create: seed.tracking.map((event) => ({
          fromStatus: event.fromStatus,
          toStatus: event.toStatus,
          notes: event.notes,
          ...(event.createdAt ? { createdAt: event.createdAt } : {})
        }))
      }
    }
  });
}

async function main() {
  const pickLists = new Map<string, Awaited<ReturnType<typeof upsertPickList>>>();
  for (const seed of PICK_LISTS) {
    pickLists.set(seed.id, await upsertPickList(seed));
  }

  const planned = pickLists.get(SEED_PICKLISTS.PLANNED)!;
  const inTransit = pickLists.get(SEED_PICKLISTS.IN_TRANSIT)!;
  const delivered = pickLists.get(SEED_PICKLISTS.DELIVERED)!;

  await upsertShipment(
    {
      code: SEED_SHIPMENTS.PLANNED,
      pickListId: planned.id,
      status: "PLANNED",
      tracking: [{ fromStatus: null, toStatus: "PLANNED", notes: "Expedition planifiee" }]
    },
    planned
  );

  await upsertShipment(
    {
      code: SEED_SHIPMENTS.IN_TRANSIT,
      pickListId: inTransit.id,
      status: "IN_TRANSIT",
      shippedAt: daysAgo(2),
      tracking: [
        { fromStatus: null, toStatus: "PLANNED", notes: "Preparation", createdAt: daysAgo(4) },
        {
          fromStatus: "PLANNED",
          toStatus: "IN_TRANSIT",
          notes: "Pris en charge transporteur",
          createdAt: daysAgo(2)
        }
      ]
    },
    inTransit
  );

  await upsertShipment(
    {
      code: SEED_SHIPMENTS.DELIVERED,
      pickListId: delivered.id,
      status: "DELIVERED",
      shippedAt: daysAgo(5),
      deliveredAt: daysAgo(1),
      tracking: [
        { fromStatus: null, toStatus: "PLANNED", notes: "Preparation", createdAt: daysAgo(8) },
        {
          fromStatus: "PLANNED",
          toStatus: "IN_TRANSIT",
          notes: "Depart entrepot",
          createdAt: daysAgo(5)
        },
        {
          fromStatus: "IN_TRANSIT",
          toStatus: "DELIVERED",
          notes: "Livraison confirmee",
          createdAt: daysAgo(1)
        }
      ]
    },
    delivered
  );

  console.log("Expedition seed completed:", {
    pickLists: PICK_LISTS.map((p) => p.code),
    shipments: Object.values(SEED_SHIPMENTS),
    siteCode: SEED_SITES.LYO
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
