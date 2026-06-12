/** Besoin matière total = coefficient par produit × quantité OF. */
export function computeBomNeed(qtyPerUnit: number, orderQty: number): number {
  const raw = qtyPerUnit * orderQty
  if (Number.isInteger(qtyPerUnit) && Number.isInteger(orderQty)) return raw
  return Math.round(raw * 100) / 100
}

export function deriveQtyPerUnit(qtyNeeded: number, orderQty: number): number {
  if (orderQty <= 0) return qtyNeeded
  const raw = qtyNeeded / orderQty
  return normalizeQtyPerUnit(raw)
}

/** Coefficient BOM arrondi pour l'affichage et la persistance. */
export function normalizeQtyPerUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

/** Affichage lisible des quantités BOM (évite 1.4285714285714286). */
export function formatBomQty(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 10 ** maxDecimals) / 10 ** maxDecimals
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(maxDecimals).replace(/\.?0+$/, '')
}

/** Stock en entiers : on arrondit au supérieur pour couvrir le besoin BOM. */
export function toStockReservationQty(bomNeed: number): number {
  if (!Number.isFinite(bomNeed) || bomNeed <= 0) return 0
  return Number.isInteger(bomNeed) ? bomNeed : Math.ceil(bomNeed)
}
