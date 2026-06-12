import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import {
  SEED_ORDERS,
  SEED_PICK_LIST_VARIANTS,
  SEED_SHIPMENT_DETAILS,
  SEED_SHIPMENTS,
  SEED_SITES
} from "@aeronexis/shared";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
const prisma = createPrismaClient(PrismaClient, process.env.SHIPMENT_DATABASE_URL);

type PickListSeed = (typeof SEED_PICK_LIST_VARIANTS)[number];

type ShipmentSeed = {
  code: string;
  pickListId: string;
  status: string;
  carrier?: string;
  deliveryAddress?: string;
  emoji?: string;
  plannedShipDate?: Date;
  plannedDeliveryDate?: Date;
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
  const pickedQty = "pickedQty" in seed ? seed.pickedQty : seed.quantity;
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
            pickedQty
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
        pickedQty
      }
    });
  } else {
    await prisma.pickListLine.updateMany({
      where: { pickListId: pickList.id },
      data: {
        productCode: seed.productCode,
        quantity: seed.quantity,
        pickedQty
      }
    });
  }

  return pickList;
}

async function upsertShipment(
  seed: ShipmentSeed,
  pickList: { orderNumber: string; clientCode: string | null; siteCode: string }
) {
  const existing = await prisma.shipment.findFirst({
    where: { code: seed.code, deletedAt: null }
  });

  const shipmentData = {
    pickListId: seed.pickListId,
    orderNumber: pickList.orderNumber,
    clientCode: pickList.clientCode,
    siteCode: pickList.siteCode,
    status: seed.status,
    carrier: seed.carrier,
    deliveryAddress: seed.deliveryAddress,
    emoji: seed.emoji,
    plannedShipDate: seed.plannedShipDate,
    plannedDeliveryDate: seed.plannedDeliveryDate,
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
  };

  if (existing) {
    await prisma.shipmentTrackingEvent.deleteMany({ where: { shipmentId: existing.id } });
    await prisma.shipment.update({
      where: { id: existing.id },
      data: shipmentData
    });
    return;
  }

  await prisma.shipment.create({
    data: {
      code: seed.code,
      ...shipmentData
    }
  });
}

function shipmentDetails(code: keyof typeof SEED_SHIPMENT_DETAILS) {
  const details = SEED_SHIPMENT_DETAILS[code];
  return {
    carrier: details.carrier,
    deliveryAddress: details.deliveryAddress,
    emoji: details.emoji,
    plannedShipDate: new Date(details.plannedShipDate),
    plannedDeliveryDate: new Date(details.plannedDeliveryDate)
  };
}

async function main() {
  const pickLists = new Map<string, Awaited<ReturnType<typeof upsertPickList>>>();
  for (const seed of SEED_PICK_LIST_VARIANTS) {
    pickLists.set(seed.id, await upsertPickList(seed));
  }

  const planned = pickLists.get(SEED_PICK_LIST_VARIANTS[0].id)!;
  const inTransit = pickLists.get(SEED_PICK_LIST_VARIANTS[1].id)!;
  const delivered = pickLists.get(SEED_PICK_LIST_VARIANTS[2].id)!;
  const parPlanned = pickLists.get(SEED_PICK_LIST_VARIANTS[4].id)!;

  await upsertShipment(
    {
      code: SEED_SHIPMENTS.PLANNED,
      pickListId: planned.id,
      status: "PLANNED",
      ...shipmentDetails(SEED_SHIPMENTS.PLANNED),
      tracking: [{ fromStatus: null, toStatus: "PLANNED", notes: "Expedition planifiee" }]
    },
    planned
  );

  await upsertShipment(
    {
      code: SEED_SHIPMENTS.IN_TRANSIT,
      pickListId: inTransit.id,
      status: "IN_TRANSIT",
      ...shipmentDetails(SEED_SHIPMENTS.IN_TRANSIT),
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
      ...shipmentDetails(SEED_SHIPMENTS.DELIVERED),
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

  await upsertShipment(
    {
      code: SEED_SHIPMENTS.PAR_PLANNED,
      pickListId: parPlanned.id,
      status: "PLANNED",
      ...shipmentDetails(SEED_SHIPMENTS.PAR_PLANNED),
      tracking: [
        {
          fromStatus: null,
          toStatus: "PLANNED",
          notes: `Expedition Paris planifiee pour ${SEED_ORDERS.CMD_PAR}`
        }
      ]
    },
    parPlanned
  );

  const pendingCount = await prisma.pickList.count({ where: { status: "PENDING" } });

  console.log("Expedition seed completed:", {
    pickLists: SEED_PICK_LIST_VARIANTS.map((p) => p.code),
    shipments: [...Object.values(SEED_SHIPMENTS)],
    pendingPickLists: pendingCount,
    sites: [SEED_SITES.LYO, SEED_SITES.PAR]
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
