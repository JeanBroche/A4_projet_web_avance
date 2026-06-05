import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = createPrismaClient(PrismaClient);

async function main() {
  await prisma.delivery.upsert({
    where: { code: "DEL-001" },
    update: {
      orderNumber: "ORD-PLACEHOLDER-001",
      status: "pending",
      siteCode: "SITE-LYO"
    },
    create: {
      code: "DEL-001",
      orderNumber: "ORD-PLACEHOLDER-001",
      status: "pending",
      siteCode: "SITE-LYO"
    }
  });

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
