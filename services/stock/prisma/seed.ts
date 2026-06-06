import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = createPrismaClient(PrismaClient);

const MATERIALS = [
  {
    code: "MAT-001",
    description: "Acier inox 316L",
    unit: "kg",
    currentStock: 120,
    minimumStock: 50,
    reservedStock: 10,
    supplier: "MetalSupply SA"
  },
  {
    code: "MAT-002",
    description: "Titanium grade 5",
    unit: "kg",
    currentStock: 8,
    minimumStock: 5,
    reservedStock: 2,
    supplier: "AeroMat FR"
  },
  {
    code: "MAT-003",
    description: "Joint torique viton",
    unit: "pcs",
    currentStock: 500,
    minimumStock: 100,
    reservedStock: 0,
    supplier: "SealTech"
  }
] as const;

async function main() {
  for (const material of MATERIALS) {
    const existing = await prisma.material.findFirst({
      where: {
        siteCode: "SITE-LYO",
        code: material.code,
        deletedAt: null
      }
    });

    if (existing) {
      await prisma.material.update({
        where: { id: existing.id },
        data: material
      });
    } else {
      await prisma.material.create({
        data: { ...material, siteCode: "SITE-LYO" }
      });
    }
  }

  console.log("Stock seed completed:", { materials: MATERIALS.length, siteCode: "SITE-LYO" });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
