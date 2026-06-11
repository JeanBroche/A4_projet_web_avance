import type { Material } from "../generated/prisma/client.js";
import { prisma } from "../db.js";
import { createError } from "@aeronexis/services-shared";
import { emitMaterialLowIfNeeded } from "./alert-notifier.js";

export type DbClient =
  | typeof prisma
  | Omit<
      typeof prisma,
      "$connect" | "$disconnect" | "$extends" | "$transaction" | "$use" | "$on"
    >;

export function computeAvailable(material: Pick<Material, "currentStock" | "reservedStock">) {
  return Math.max(0, material.currentStock - material.reservedStock);
}

export function toStockLevel(material: Material) {
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

export type StockLevel = ReturnType<typeof toStockLevel>;

export function consolidateByCode(levels: StockLevel[]) {
  const groups = new Map<string, {
    code: string;
    description: string | null;
    unit: string;
    sites: Array<{
      siteCode: string;
      current: number;
      reserved: number;
      available: number;
      minimum: number;
    }>;
    current: number;
    reserved: number;
    available: number;
    minimum: number;
  }>();
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

export async function evaluateThreshold(client: DbClient, materialId: string) {
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
    let alert;
    if (openAlert) {
      alert = await client.stockAlert.update({
        where: { id: openAlert.id },
        data: { severity, message }
      });
    } else {
      alert = await client.stockAlert.create({
        data: {
          materialId,
          siteCode: material.siteCode,
          severity,
          message
        }
      });
    }
    emitMaterialLowIfNeeded({
      alertId: alert.id,
      materialId,
      materialCode: material.code,
      siteCode: material.siteCode,
      severity,
      available,
      minimum: material.minimumStock,
      message
    });
    return alert;
  }
  if (openAlert) {
    return client.stockAlert.update({
      where: { id: openAlert.id },
      data: { resolvedAt: new Date() }
    });
  }
  return null;
}

export async function loadActiveMaterial(client: DbClient, materialId: string) {
  const material = await client.material.findFirst({
    where: { id: materialId, deletedAt: null }
  });
  if (!material) {
    throw createError("NOT_FOUND", `Material not found: ${materialId}`);
  }
  return material;
}