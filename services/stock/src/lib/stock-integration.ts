import type { StockReservation } from "../generated/prisma/client.js";
import { prisma } from "../db.js";
import { createError, resolveEffectiveSite } from "@aeronexis/services-shared";
import { evaluateThreshold } from "./stock-helpers.js";
import { formatStockDocumentRef, resolveOfId } from "@aeronexis/shared";

export type PickListCompletedPayload = {
  pickListId: string;
  code: string;
  orderNumber: string;
  ofId?: string | null;
  siteCode: string;
  lines: Array<{ productCode: string; quantity: number; pickedQty: number }>;
};

export type ShipmentStatusChangedPayload = {
  id: string;
  code: string;
  orderNumber: string;
  ofId?: string | null;
  siteCode: string;
  fromStatus: string;
  toStatus: string;
};

export function toReservationSummary(reservation: StockReservation) {
  return {
    id: reservation.id,
    ofId: reservation.ofId,
    materialId: reservation.materialId,
    siteCode: reservation.siteCode,
    quantity: reservation.quantity,
    status: reservation.status,
    createdAt: reservation.createdAt,
    releasedAt: reservation.releasedAt
  };
}

export async function recordPickListStockOut(payload: PickListCompletedPayload) {
  for (const line of payload.lines) {
    const qty = line.pickedQty || line.quantity;
    const material = await prisma.material.findFirst({
      where: {
        siteCode: payload.siteCode,
        code: line.productCode,
        deletedAt: null
      }
    });

    if (!material) {
      continue;
    }

    const newCurrent = material.currentStock - qty;
    if (newCurrent < 0) {
      throw createError(
        "INSUFFICIENT_STOCK",
        `Insufficient stock for ${line.productCode}: need ${qty}, have ${material.currentStock}`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          materialId: material.id,
          siteCode: payload.siteCode,
          type: "OUT",
          quantity: qty,
          reason: "Pick list completed",
          documentRef: formatStockDocumentRef(
            payload.ofId ?? resolveOfId(null, payload.orderNumber),
            payload.code
          )
        }
      });
      await tx.material.update({
        where: { id: material.id },
        data: { currentStock: newCurrent }
      });
      await evaluateThreshold(tx, material.id);
    });
  }
}

export async function releaseReservationsByOfId(ofId: string, siteCode?: string) {
  const reservations = await prisma.stockReservation.findMany({
    where: {
      ofId,
      status: "ACTIVE",
      ...(siteCode ? { siteCode } : {})
    }
  });

  for (const reservation of reservations) {
    await prisma.$transaction(async (tx) => {
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: { status: "RELEASED", releasedAt: new Date() }
      });
      const material = await tx.material.findUnique({
        where: { id: reservation.materialId }
      });
      if (material) {
        await tx.material.update({
          where: { id: material.id },
          data: {
            reservedStock: Math.max(0, material.reservedStock - reservation.quantity)
          }
        });
        await evaluateThreshold(tx, material.id);
      }
    });
  }

  return reservations.length;
}

export async function listReservations(
  auth: { siteId: string | null; roles: string[] },
  params: {
    ofId?: string;
    siteCode?: string;
    siteId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  const effectiveSite = resolveEffectiveSite(auth, params);
  const reservations = await prisma.stockReservation.findMany({
    where: {
      ...(params.ofId ? { ofId: params.ofId } : {}),
      ...(effectiveSite ? { siteCode: effectiveSite } : {}),
      ...(params.status ? { status: params.status } : {})
    },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 100,
    skip: params.offset ?? 0
  });

  return reservations.map(toReservationSummary);
}
