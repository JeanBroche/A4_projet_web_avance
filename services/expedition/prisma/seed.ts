import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = createPrismaClient(PrismaClient);

async function main() {
  const existing = await prisma.delivery.findFirst({
    where: { code: "DEL-001", deletedAt: null }
  });

  if (existing) {
    await prisma.delivery.update({
      where: { id: existing.id },
      data: {
        orderNumber: "ORD-PLACEHOLDER-001",
        status: "pending",
        siteCode: "SITE-LYO"
      }
    });
  } else {
    await prisma.delivery.create({
      data: {
        code: "DEL-001",
        orderNumber: "ORD-PLACEHOLDER-001",
        status: "pending",
        siteCode: "SITE-LYO"
      }
    });
  }

  console.log("Expedition seed completed:", { delivery: "DEL-001", siteCode: "SITE-LYO" });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
