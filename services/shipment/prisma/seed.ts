import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = createPrismaClient(PrismaClient, process.env.SHIPMENT_DATABASE_URL);

async function main() {
  const pickList = await prisma.pickList.upsert({
    where: { id: "seed-picklist-001" },
    update: {
      code: "PICK-2025-00001",
      orderNumber: "CMD-2025-00001",
      clientCode: "CLI-001",
      siteCode: "SITE-LYO",
      status: "COMPLETED",
      ofId: "BATCH-SEED-001"
    },
    create: {
      id: "seed-picklist-001",
      code: "PICK-2025-00001",
      orderNumber: "CMD-2025-00001",
      clientCode: "CLI-001",
      siteCode: "SITE-LYO",
      status: "COMPLETED",
      ofId: "BATCH-SEED-001",
      lines: {
        create: [
          {
            lineNumber: 1,
            productCode: "PROD-001",
            quantity: 2,
            pickedQty: 2
          }
        ]
      }
    },
    include: { lines: true }
  });

  const existingShipment = await prisma.shipment.findFirst({
    where: { code: "SHP-2025-00001", deletedAt: null }
  });

  if (existingShipment) {
    await prisma.shipment.update({
      where: { id: existingShipment.id },
      data: {
        pickListId: pickList.id,
        orderNumber: pickList.orderNumber,
        clientCode: pickList.clientCode,
        siteCode: pickList.siteCode,
        status: "PLANNED"
      }
    });
  } else {
    await prisma.shipment.create({
      data: {
        code: "SHP-2025-00001",
        pickListId: pickList.id,
        orderNumber: pickList.orderNumber,
        clientCode: pickList.clientCode,
        siteCode: pickList.siteCode,
        status: "PLANNED",
        trackingEvents: {
          create: {
            fromStatus: null,
            toStatus: "PLANNED",
            notes: "Seed shipment"
          }
        }
      }
    });
  }

  console.log("Expedition seed completed:", {
    pickList: pickList.code,
    shipment: "SHP-2025-00001",
    siteCode: "SITE-LYO"
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
