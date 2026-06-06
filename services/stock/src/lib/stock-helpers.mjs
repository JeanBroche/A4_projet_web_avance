import { createError } from "./errors.mjs";

/**
 * @param {{ currentStock: number, reservedStock: number }} material
 */
export function computeAvailable(material) {
  return Math.max(0, material.currentStock - material.reservedStock);
}

/**
 * Map a Material row to the StockLevel API contract.
 *
 * @param {object} material
 */
export function toStockLevel(material) {
  return {
    materialId: material.id,
    code: material.code,
    description: material.description,
    unit: material.unit,
    siteCode: material.siteCode,
    current: material.currentStock,
    reserved: material.reservedStock,
    available: computeAvailable(material),
    minimum: material.minimumStock,
    supplier: material.supplier ?? null,
    lastReplenishment: material.lastReplenishment ?? null
  };
}

/**
 * @param {object[]} levels
 */
export function consolidateByCode(levels) {
  const groups = new Map();

  for (const level of levels) {
    const existing = groups.get(level.code) ?? {
      code: level.code,
      description: level.description,
      unit: level.unit,
      sites: [],
      current: 0,
      reserved: 0,
      available: 0,
      minimum: 0
    };

    existing.sites.push({
      siteCode: level.siteCode,
      current: level.current,
      reserved: level.reserved,
      available: level.available,
      minimum: level.minimum
    });
    existing.current += level.current;
    existing.reserved += level.reserved;
    existing.available += level.available;
    existing.minimum += level.minimum;

    groups.set(level.code, existing);
  }

  return Array.from(groups.values());
}

/**
 * Re-evaluate the threshold alert for a material. Creates/updates an open
 * alert when available falls below the minimum, or resolves the open alert
 * once stock is back above the threshold.
 *
 * Caller passes the prisma client (or a transaction client) to allow
 * inclusion in atomic operations.
 *
 * @param {import("@prisma/client").PrismaClient} client
 * @param {string} materialId
 */
export async function evaluateThreshold(client, materialId) {
  const material = await client.material.findFirst({
    where: { id: materialId, deletedAt: null }
  });

  if (!material) {
    return null;
  }

  const available = computeAvailable(material);
  const breaches = available < material.minimumStock;

  const openAlert = await client.stockAlert.findFirst({
    where: { materialId, resolvedAt: null }
  });

  if (breaches) {
    const severity = available <= 0 ? "CRITICAL" : "WARNING";
    const message = `Stock disponible (${available}) sous le seuil minimum (${material.minimumStock})`;

    if (openAlert) {
      return client.stockAlert.update({
        where: { id: openAlert.id },
        data: { severity, message }
      });
    }

    return client.stockAlert.create({
      data: {
        materialId,
        siteCode: material.siteCode,
        severity,
        message
      }
    });
  }

  if (openAlert) {
    return client.stockAlert.update({
      where: { id: openAlert.id },
      data: { resolvedAt: new Date() }
    });
  }

  return null;
}

/**
 * @param {import("@prisma/client").PrismaClient} client
 * @param {string} materialId
 */
export async function loadActiveMaterial(client, materialId) {
  const material = await client.material.findFirst({
    where: { id: materialId, deletedAt: null }
  });

  if (!material) {
    throw createError("NOT_FOUND", `Material not found: ${materialId}`);
  }

  return material;
}
