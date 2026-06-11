import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import {
  SEED_BATCHES,
  SEED_MATERIALS,
  SEED_SITES
} from "@aeronexis/shared";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
const prisma = createPrismaClient(PrismaClient, process.env.STOCK_DATABASE_URL);

type MaterialSeed = {
  code: string;
  description: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  reservedStock: number;
  supplier: string;
  siteCode: string;
};

const MATERIALS: MaterialSeed[] = [
  {
    code: SEED_MATERIALS.ACIER,
    description: "Acier inox 316L",
    unit: "kg",
    currentStock: 120,
    minimumStock: 50,
    reservedStock: 10,
    supplier: "MetalSupply SA",
    siteCode: SEED_SITES.LYO
  },
  {
    code: SEED_MATERIALS.TITANE,
    description: "Titanium grade 5",
    unit: "kg",
    currentStock: 8,
    minimumStock: 15,
    reservedStock: 2,
    supplier: "AeroMat FR",
    siteCode: SEED_SITES.LYO
  },
  {
    code: SEED_MATERIALS.JOINT,
    description: "Joint torique viton",
    unit: "pcs",
    currentStock: 500,
    minimumStock: 100,
    reservedStock: 0,
    supplier: "SealTech",
    siteCode: SEED_SITES.LYO
  },
  {
    code: SEED_MATERIALS.ACIER,
    description: "Acier inox 316L",
    unit: "kg",
    currentStock: 80,
    minimumStock: 40,
    reservedStock: 0,
    supplier: "MetalSupply SA",
    siteCode: SEED_SITES.PAR
  }
];

async function upsertMaterial(material: MaterialSeed) {
  const existing = await prisma.material.findFirst({
    where: { siteCode: material.siteCode, code: material.code, deletedAt: null }
  });
  if (existing) {
    return prisma.material.update({
      where: { id: existing.id },
      data: material
    });
  }
  return prisma.material.create({ data: material });
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function upsertReservation(
  ofId: string,
  materialId: string,
  siteCode: string,
  quantity: number
) {
  const existing = await prisma.stockReservation.findFirst({
    where: { ofId, materialId, status: "ACTIVE" }
  });
  if (existing) {
    return prisma.stockReservation.update({
      where: { id: existing.id },
      data: { quantity, siteCode }
    });
  }
  return prisma.stockReservation.create({
    data: { ofId, materialId, siteCode, quantity, status: "ACTIVE" }
  });
}

async function main() {
  const persisted: Record<string, string> = {};
  for (const material of MATERIALS) {
    const row = await upsertMaterial(material);
    persisted[`${material.siteCode}/${material.code}`] = row.id;
  }

  const matLyoTitane = persisted[`${SEED_SITES.LYO}/${SEED_MATERIALS.TITANE}`];
  const matLyoAcier = persisted[`${SEED_SITES.LYO}/${SEED_MATERIALS.ACIER}`];
  const matLyoJoint = persisted[`${SEED_SITES.LYO}/${SEED_MATERIALS.JOINT}`];

  if (matLyoAcier) {
    const movementsExist = await prisma.stockMovement.findFirst({
      where: { materialId: matLyoAcier, reason: "Consommation OF-2025-001" }
    });
    if (!movementsExist) {
      await prisma.stockMovement.createMany({
        data: [
          {
            materialId: matLyoAcier,
            siteCode: SEED_SITES.LYO,
            type: "OUT",
            quantity: 5,
            reason: "Consommation OF-2025-001",
            createdAt: daysAgo(20)
          },
          {
            materialId: matLyoAcier,
            siteCode: SEED_SITES.LYO,
            type: "OUT",
            quantity: 8,
            reason: "Consommation OF-2025-002",
            createdAt: daysAgo(10)
          },
          {
            materialId: matLyoAcier,
            siteCode: SEED_SITES.LYO,
            type: "IN",
            quantity: 30,
            reason: "Reception fournisseur",
            documentRef: "BL-2025-018",
            createdAt: daysAgo(5)
          }
        ]
      });
    }

    const returnExists = await prisma.stockMovement.findFirst({
      where: { materialId: matLyoAcier, reason: "Retour stock client" }
    });
    if (!returnExists) {
      await prisma.stockMovement.create({
        data: {
          materialId: matLyoAcier,
          siteCode: SEED_SITES.LYO,
          type: "IN",
          quantity: 2,
          reason: "Retour stock client",
          documentRef: "RET-2025-001",
          createdAt: daysAgo(2)
        }
      });
    }
  }

  if (matLyoTitane) {
    const alertExists = await prisma.stockAlert.findFirst({
      where: { materialId: matLyoTitane, resolvedAt: null }
    });
    if (!alertExists) {
      await prisma.stockAlert.create({
        data: {
          materialId: matLyoTitane,
          siteCode: SEED_SITES.LYO,
          severity: "CRITICAL",
          message: "Stock disponible sous le seuil minimum"
        }
      });
    }
    const delayExists = await prisma.supplierDelay.findFirst({
      where: { materialId: matLyoTitane }
    });
    if (!delayExists) {
      await prisma.supplierDelay.create({
        data: {
          materialId: matLyoTitane,
          supplier: "AeroMat FR",
          expectedDate: daysAgo(7),
          notes: "Retard usine, livraison reprogrammee"
        }
      });
    }
  }

  if (matLyoAcier && matLyoJoint) {
    await upsertReservation(SEED_BATCHES.LYO_IN_PROGRESS, matLyoAcier, SEED_SITES.LYO, 1);
    await upsertReservation(SEED_BATCHES.LYO_IN_PROGRESS, matLyoTitane!, SEED_SITES.LYO, 2);
  }

  const reservationCount = await prisma.stockReservation.count({
    where: { ofId: SEED_BATCHES.LYO_IN_PROGRESS, status: "ACTIVE" }
  });

  console.log("Stock seed completed:", {
    materials: MATERIALS.length,
    sites: Array.from(new Set(MATERIALS.map((m) => m.siteCode))),
    activeReservations: reservationCount
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
