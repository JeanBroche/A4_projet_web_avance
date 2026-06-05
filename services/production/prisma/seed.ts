import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = createPrismaClient(PrismaClient);

async function main() {
  await prisma.productStock.upsert({
    where: {
      siteCode_productCode: {
        siteCode: "SITE-LYO",
        productCode: "PROD-001"
      }
    },
    update: {
      description: "Palier haute precision PN-100",
      quantity: 10,
      reservedQuantity: 2
    },
    create: {
      productCode: "PROD-001",
      description: "Palier haute precision PN-100",
      quantity: 10,
      reservedQuantity: 2,
      siteCode: "SITE-LYO"
    }
  });

  console.log("Production seed completed:", { productCode: "PROD-001", siteCode: "SITE-LYO" });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
