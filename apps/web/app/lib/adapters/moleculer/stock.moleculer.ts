import { useApiClient } from '~/lib/api/client'
import type { StockAdapter, StockAlert } from '~/lib/adapters/types'
import {
  mapConsolidatedToUi,
  mapForecastToUi,
  mapLotToUi,
  mapMaterialToStockLevel,
  mapMovementToUi,
  mapPurchaseOrderToUi,
  mapReservationToUi,
  mapSupplierDelayToUi
} from '~/lib/mappers/stock'
import { isCuidLike, resolveStringIdByNumeric } from '~/lib/mappers/resolve-id'
import { toNumericId } from '~/lib/mappers/id'

type LevelRow = {
  materialId: string
  code: string
  siteCode?: string
  current?: number
}

const reservationCuidByNumeric = new Map<number, string>()

function trackReservationCuids(raw: Array<{ id: string }>) {
  for (const row of raw) {
    if (row.id) reservationCuidByNumeric.set(toNumericId(row.id), row.id)
  }
}

export function createMoleculerStockAdapter(
  getSiteCode: () => string
): StockAdapter {
  const { request } = useApiClient()
  const siteCode = () => getSiteCode()

  async function listRawLevels(): Promise<LevelRow[]> {
    return request<LevelRow[]>('/stock/levels', {
      params: { siteCode: siteCode() }
    })
  }

  async function resolveMaterialId(referenceOrId: string): Promise<string | null> {
    if (isCuidLike(referenceOrId)) return referenceOrId
    const levels = await listRawLevels()
    const match = levels.find(l => l.code === referenceOrId || l.materialId === referenceOrId)
    return match?.materialId ?? null
  }

  async function resolveReservationCuid(id: number | string): Promise<string> {
    if (isCuidLike(String(id))) return String(id)
    const numeric = Number(id)
    const cached = reservationCuidByNumeric.get(numeric)
    if (cached) return cached

    const result = await request<{ reservations: Array<{ id: string }> }>(
      '/stock/reservations',
      { params: { siteCode: siteCode(), status: 'ACTIVE' } }
    )
    const raw = result.reservations ?? []
    trackReservationCuids(raw)

    const resolved =
      reservationCuidByNumeric.get(numeric) ??
      resolveStringIdByNumeric(raw, numeric, 'id')
    if (!resolved) throw new Error('NOT_FOUND')
    reservationCuidByNumeric.set(numeric, resolved)
    return resolved
  }

  return {
    async listLevels() {
      const levels = await listRawLevels()
      return levels.map(l => mapMaterialToStockLevel(l as Parameters<typeof mapMaterialToStockLevel>[0]))
    },

    async listConsolidatedLevels() {
      const items = await request<Array<Parameters<typeof mapConsolidatedToUi>[0]>>(
        '/stock/levels/consolidated',
        {}
      )
      return (items ?? []).map(mapConsolidatedToUi)
    },

    async listAlerts() {
      const alerts = await request<Array<{
        id: string
        severity?: string
        message?: string
        material?: { code?: string, description?: string | null }
      }>>('/stock/alerts', {
        params: { siteCode: siteCode() }
      })
      return (alerts ?? []).map((a): StockAlert => ({
        id: a.id,
        materialCode: a.material?.code ?? '—',
        materialName: a.material?.description ?? a.material?.code ?? '—',
        severity: a.severity === 'CRITICAL' ? 'critical' : 'warning',
        message: a.message ?? 'Alerte stock'
      }))
    },

    async createLevel(input) {
      const result = await request<Parameters<typeof mapMaterialToStockLevel>[0]>('/stock/materials', {
        method: 'PUT',
        body: {
          code: input.reference,
          siteCode: siteCode(),
          description: input.name,
          unit: input.unit,
          currentStock: input.qty,
          minimumStock: input.minQty
        }
      })
      return mapMaterialToStockLevel(result)
    },

    async updateLevel(id, qty) {
      const levels = await listRawLevels()
      const materialId = isCuidLike(String(id))
        ? String(id)
        : resolveStringIdByNumeric(levels, id, 'materialId')
      if (!materialId) throw new Error('NOT_FOUND')
      const current = levels.find(l => l.materialId === materialId)
      if (!current) throw new Error('NOT_FOUND')
      const delta = qty - Number(current.current ?? 0)
      if (delta === 0) {
        return mapMaterialToStockLevel(current as Parameters<typeof mapMaterialToStockLevel>[0])
      }
      await request('/stock/movements', {
        method: 'POST',
        body: {
          materialId,
          siteCode: current.siteCode ?? siteCode(),
          type: delta > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(delta),
          reason: 'Ajustement stock'
        }
      })
      const updated = await request<Parameters<typeof mapMaterialToStockLevel>[0]>(
        `/stock/materials/${encodeURIComponent(materialId)}`,
        {}
      )
      return mapMaterialToStockLevel(updated)
    },

    async deleteLevel(id) {
      const levels = await listRawLevels()
      const materialId = isCuidLike(String(id))
        ? String(id)
        : resolveStringIdByNumeric(levels, id, 'materialId')
      if (!materialId) throw new Error('NOT_FOUND')
      const current = levels.find(l => l.materialId === materialId)
      if (!current) throw new Error('NOT_FOUND')
      const qty = Number(current.current ?? 0)
      if (qty > 0) {
        await request('/stock/movements', {
          method: 'POST',
          body: {
            materialId,
            siteCode: current.siteCode ?? siteCode(),
            type: 'OUT',
            quantity: qty,
            reason: 'Suppression niveau stock'
          }
        })
      }
    },

    async listReservations(ofId?: string) {
      const result = await request<{ reservations: Array<Parameters<typeof mapReservationToUi>[0]> }>(
        '/stock/reservations',
        {
          params: {
            ...(ofId ? { ofId } : {}),
            siteCode: siteCode(),
            status: 'ACTIVE'
          }
        }
      )
      const raw = result.reservations ?? []
      trackReservationCuids(raw)
      return raw.map(mapReservationToUi)
    },

    async createReservation(input) {
      const lines = await Promise.all(
        input.lines.map(async (line) => {
          const ref = line.materialId
          const materialId = await resolveMaterialId(ref)
          if (!materialId) throw new Error('NOT_FOUND')
          return { materialId, qty: line.qty }
        })
      )
      const result = await request<{ reservations: Array<Parameters<typeof mapReservationToUi>[0]> }>(
        '/stock/reservations',
        {
          method: 'POST',
          body: { ofId: input.ofId, siteCode: siteCode(), lines }
        }
      )
      const raw = result.reservations ?? []
      trackReservationCuids(raw)
      return raw.map(mapReservationToUi)
    },

    async updateReservation(id, qty) {
      const cuid = await resolveReservationCuid(id)
      const raw = await request<Parameters<typeof mapReservationToUi>[0]>(
        `/stock/reservations/${encodeURIComponent(cuid)}`,
        { method: 'PATCH', body: { qty } }
      )
      const mapped = mapReservationToUi(raw)
      trackReservationCuids([raw])
      return mapped
    },

    async releaseReservation(id) {
      const cuid = await resolveReservationCuid(id)
      const result = await request<{ reservation?: Parameters<typeof mapReservationToUi>[0] }>(
        `/stock/reservations/${encodeURIComponent(cuid)}/release`,
        { method: 'POST' }
      )
      const raw = result.reservation ?? (result as unknown as Parameters<typeof mapReservationToUi>[0])
      return mapReservationToUi(raw)
    },

    async cancelReservation(id) {
      const cuid = await resolveReservationCuid(id)
      const result = await request<{ reservation?: Parameters<typeof mapReservationToUi>[0] }>(
        `/stock/reservations/${encodeURIComponent(cuid)}/cancel`,
        { method: 'POST' }
      )
      const raw = result.reservation ?? (result as unknown as Parameters<typeof mapReservationToUi>[0])
      return mapReservationToUi(raw)
    },

    async getRuptureForecast() {
      const result = await request<{ items?: Array<Parameters<typeof mapForecastToUi>[0]> } | Array<Parameters<typeof mapForecastToUi>[0]>>(
        '/stock/forecast/rupture',
        { params: { siteCode: siteCode() } }
      )
      const items = Array.isArray(result) ? result : (result.items ?? [])
      return items.map(mapForecastToUi)
    },

    async reportSupplierDelay(input) {
      const levels = await listRawLevels()
      const material = levels.find(l => l.code === input.materialReference)
      if (!material?.materialId) throw new Error('NOT_FOUND')
      const expectedDate = new Date()
      const actualDate = new Date(expectedDate.getTime() + input.delayDays * 86400000)
      const delay = await request<Parameters<typeof mapSupplierDelayToUi>[0]>('/stock/supplier-delays', {
        method: 'POST',
        body: {
          materialId: material.materialId,
          supplier: input.supplier,
          expectedDate,
          actualDate,
          notes: input.comment
        }
      })
      return mapSupplierDelayToUi(delay)
    },

    async listSupplierDelays() {
      const items = await request<Array<Parameters<typeof mapSupplierDelayToUi>[0]>>(
        '/stock/supplier-delays',
        { params: { siteCode: siteCode() } }
      )
      return (items ?? []).map(mapSupplierDelayToUi)
    },

    async listMovements(filters) {
      let materialId: string | undefined
      if (filters?.materialReference) {
        const resolved = await resolveMaterialId(filters.materialReference)
        if (!resolved) return []
        materialId = resolved
      }
      const items = await request<Array<Parameters<typeof mapMovementToUi>[0]>>(
        '/stock/movements',
        {
          params: {
            siteCode: siteCode(),
            ...(materialId ? { materialId } : {}),
            ...(filters?.limit ? { limit: filters.limit } : {})
          }
        }
      )
      return (items ?? []).map(mapMovementToUi)
    },

    async listLots(filters) {
      let materialId: string | undefined
      if (filters?.materialReference) {
        const resolved = await resolveMaterialId(filters.materialReference)
        if (!resolved) return []
        materialId = resolved
      }
      const items = await request<Array<Parameters<typeof mapLotToUi>[0]>>(
        '/stock/lots',
        {
          params: {
            siteCode: siteCode(),
            ...(materialId ? { materialId } : {}),
            ...(filters?.status ? { status: filters.status } : {})
          }
        }
      )
      return (items ?? []).map(mapLotToUi)
    },

    async createLot(input) {
      const materialId = await resolveMaterialId(input.materialReference)
      if (!materialId) throw new Error('NOT_FOUND')
      const raw = await request<Parameters<typeof mapLotToUi>[0]>('/stock/lots', {
        method: 'POST',
        body: {
          materialId,
          siteCode: siteCode(),
          lotNumber: input.lotNumber,
          quantity: input.quantity,
          supplierLot: input.supplierLot,
          supplier: input.supplier,
          certificateRef: input.certificateRef,
          certificateUrl: input.certificateUrl,
          manufacturedAt: input.manufacturedAt,
          expiryAt: input.expiryAt,
          receivedAt: input.receivedAt,
          location: input.location,
          notes: input.notes
        }
      })
      return mapLotToUi(raw)
    },

    async updateLotStatus(id, status) {
      const raw = await request<Parameters<typeof mapLotToUi>[0]>(
        `/stock/lots/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: { status } }
      )
      return mapLotToUi(raw)
    },

    async transferStock(input) {
      const materialId = await resolveMaterialId(input.materialReference)
      if (!materialId) throw new Error('NOT_FOUND')
      const result = await request<{ transferRef: string }>('/stock/transfers', {
        method: 'POST',
        body: {
          materialId,
          sourceSiteCode: input.sourceSiteCode,
          destSiteCode: input.destSiteCode,
          quantity: input.quantity,
          reason: input.reason,
          notes: input.notes
        }
      })
      return { transferRef: result.transferRef }
    },

    async listPurchaseOrders(filters) {
      let materialId: string | undefined
      if (filters?.materialReference) {
        const resolved = await resolveMaterialId(filters.materialReference)
        if (!resolved) return []
        materialId = resolved
      }
      const items = await request<Array<Parameters<typeof mapPurchaseOrderToUi>[0]>>(
        '/stock/purchase-orders',
        {
          params: {
            siteCode: siteCode(),
            ...(filters?.status ? { status: filters.status } : {}),
            ...(materialId ? { materialId } : {})
          }
        }
      )
      return (items ?? []).map(mapPurchaseOrderToUi)
    },

    async createPurchaseOrder(input) {
      const materialId = await resolveMaterialId(input.materialReference)
      if (!materialId) throw new Error('NOT_FOUND')
      const raw = await request<Parameters<typeof mapPurchaseOrderToUi>[0]>(
        '/stock/purchase-orders',
        {
          method: 'POST',
          body: {
            materialId,
            siteCode: siteCode(),
            supplier: input.supplier,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            expectedDate: input.expectedDate,
            notes: input.notes
          }
        }
      )
      return mapPurchaseOrderToUi(raw)
    },

    async receivePurchaseOrder(id, receivedQty) {
      const raw = await request<Parameters<typeof mapPurchaseOrderToUi>[0]>(
        `/stock/purchase-orders/${encodeURIComponent(id)}/receive`,
        { method: 'POST', body: { receivedQty } }
      )
      return mapPurchaseOrderToUi(raw)
    }
  }
}
