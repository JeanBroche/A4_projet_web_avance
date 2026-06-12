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

export type RuptureForecastStatus = "rupture" | "critical" | "warning" | "ok";

export type RuptureForecastInput = {
  available: number;
  minimum: number;
  totalOutInWindow: number;
  windowDays: number;
  activeReservationQty: number;
};

export type RuptureForecastComputed = {
  consumptionPerDay: number;
  estimatedDaysToRupture: number | null;
  score: number;
  status: RuptureForecastStatus;
};

/** Score de risque de rupture sur une fenêtre glissante (consommation OUT + pression réservations). */
export function computeRuptureForecast(input: RuptureForecastInput): RuptureForecastComputed {
  const { available, minimum, totalOutInWindow, windowDays, activeReservationQty } = input;
  const historicalDaily = totalOutInWindow / windowDays;
  const reservationDaily = activeReservationQty > 0 ? activeReservationQty / 7 : 0;
  const consumptionPerDay = Math.round(Math.max(historicalDaily, reservationDaily) * 100) / 100;

  if (available <= 0) {
    return {
      consumptionPerDay,
      estimatedDaysToRupture: 0,
      score: 100,
      status: "rupture"
    };
  }

  if (consumptionPerDay <= 0) {
    if (available < minimum) {
      const ratio = available / Math.max(minimum, 1);
      const score = Math.min(100, Math.round(40 + (1 - ratio) * 60));
      return {
        consumptionPerDay: 0,
        estimatedDaysToRupture: null,
        score,
        status: score >= 70 ? "critical" : "warning"
      };
    }
    return {
      consumptionPerDay: 0,
      estimatedDaysToRupture: null,
      score: 0,
      status: "ok"
    };
  }

  const daysToRupture = available / consumptionPerDay;
  const windowRatio = 1 - daysToRupture / windowDays;
  let score = Math.min(100, Math.max(0, Math.round(windowRatio * 100)));

  if (available < minimum) {
    const thresholdBoost = Math.round((1 - available / Math.max(minimum, 1)) * 25);
    score = Math.min(100, score + thresholdBoost);
  }

  let status: RuptureForecastStatus = "ok";
  if (score >= 80 || daysToRupture <= 3) {
    status = "critical";
  } else if (score >= 50 || daysToRupture <= windowDays / 2) {
    status = "warning";
  }

  return {
    consumptionPerDay,
    estimatedDaysToRupture: Math.round(daysToRupture * 10) / 10,
    score,
    status
  };
}