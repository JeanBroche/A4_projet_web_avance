import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = createPrismaClient(PrismaClient);

async function main() {
  await prisma.client.upsert({
    where: { code: "CLI-001" },
    update: {
      name: "Aerospace Dynamics SA",
      country: "FR",
      type: "industrial",
      status: "active",
      siteCode: "SITE-LYO"
    },
    create: {
      code: "CLI-001",
      name: "Aerospace Dynamics SA",
      country: "FR",
      type: "industrial",
      status: "active",
      siteCode: "SITE-LYO"
    }
  });

  console.log("Commande seed completed:", { client: "CLI-001", siteCode: "SITE-LYO" });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
