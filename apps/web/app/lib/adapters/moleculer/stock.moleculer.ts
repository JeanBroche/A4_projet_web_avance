import { useApiClient } from '~/lib/api/client'
import type { StockAdapter, StockAlert } from '~/lib/adapters/types'
import {
  mapForecastToUi,
  mapMaterialToStockLevel,
  mapReservationToUi,
  mapSupplierDelayToUi
} from '~/lib/mappers/stock'
import { isCuidLike, resolveStringIdByNumeric } from '~/lib/mappers/resolve-id'
import type { StockReservation } from '~/types'

type LevelRow = {
  materialId: string
  code: string
  siteCode?: string
  current?: number
}

const reservationCuidByNumeric = new Map<number, string>()

function trackReservationCuids(reservations: StockReservation[], raw: Array<{ id: string }>) {
  for (let i = 0; i < reservations.length; i++) {
    const rawId = raw[i]?.id
    if (rawId) reservationCuidByNumeric.set(reservations[i]!.id, rawId)
  }
}

export function createMoleculerStockAdapter(
  getToken: () => string | null,
  getSiteCode: () => string
): StockAdapter {
  const { request } = useApiClient()
  const token = () => getToken()
  const siteCode = () => getSiteCode()

  async function listRawLevels(): Promise<LevelRow[]> {
    return request<LevelRow[]>('/stock/levels', {
      accessToken: token(),
      params: { siteCode: siteCode() }
    })
  }

  async function resolveMaterialId(referenceOrId: string): Promise<string | null> {
    if (isCuidLike(referenceOrId)) return referenceOrId
    const levels = await listRawLevels()
    const match = levels.find(l => l.code === referenceOrId || l.materialId === referenceOrId)
    return match?.materialId ?? null
  }

  return {
    async listLevels() {
      const levels = await listRawLevels()
      return levels.map(l => mapMaterialToStockLevel(l as Parameters<typeof mapMaterialToStockLevel>[0]))
    },

    async listConsolidatedLevels() {
      const levels = await request<LevelRow[]>('/stock/levels/consolidated', {
        accessToken: token(),
        params: { siteCode: siteCode() }
      })
      return (levels ?? []).map(l => mapMaterialToStockLevel(l as Parameters<typeof mapMaterialToStockLevel>[0]))
    },

    async listAlerts() {
      const alerts = await request<Array<{
        id: string
        severity?: string
        message?: string
        material?: { code?: string, description?: string | null }
      }>>('/stock/alerts', {
        accessToken: token(),
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
        },
        accessToken: token()
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
        },
        accessToken: token()
      })
      const updated = await request<Parameters<typeof mapMaterialToStockLevel>[0]>(
        `/stock/materials/${encodeURIComponent(materialId)}`,
        { accessToken: token() }
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
          },
          accessToken: token()
        })
      }
    },

    async listReservations(ofId?: string) {
      const result = await request<{ reservations: Array<Parameters<typeof mapReservationToUi>[0]> }>(
        '/stock/reservations',
        {
          accessToken: token(),
          params: {
            ...(ofId ? { ofId } : {}),
            siteCode: siteCode(),
            status: 'ACTIVE'
          }
        }
      )
      const raw = result.reservations ?? []
      const mapped = raw.map(mapReservationToUi)
      trackReservationCuids(mapped, raw)
      return mapped
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
          body: { ofId: input.ofId, siteCode: siteCode(), lines },
          accessToken: token()
        }
      )
      const raw = result.reservations ?? []
      const mapped = raw.map(mapReservationToUi)
      trackReservationCuids(mapped, raw)
      return mapped
    },

    async releaseReservation(id) {
      const cuid = reservationCuidByNumeric.get(Number(id)) ?? String(id)
      const result = await request<{ reservation?: Parameters<typeof mapReservationToUi>[0] }>(
        `/stock/reservations/${encodeURIComponent(cuid)}/release`,
        { method: 'POST', accessToken: token() }
      )
      const raw = result.reservation ?? (result as unknown as Parameters<typeof mapReservationToUi>[0])
      return mapReservationToUi(raw)
    },

    async cancelReservation(id) {
      const cuid = reservationCuidByNumeric.get(Number(id)) ?? String(id)
      const result = await request<{ reservation?: Parameters<typeof mapReservationToUi>[0] }>(
        `/stock/reservations/${encodeURIComponent(cuid)}/cancel`,
        { method: 'POST', accessToken: token() }
      )
      const raw = result.reservation ?? (result as unknown as Parameters<typeof mapReservationToUi>[0])
      return mapReservationToUi(raw)
    },

    async getRuptureForecast() {
      const result = await request<{ items?: Array<Parameters<typeof mapForecastToUi>[0]> } | Array<Parameters<typeof mapForecastToUi>[0]>>(
        '/stock/forecast/rupture',
        { accessToken: token(), params: { siteCode: siteCode() } }
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
        },
        accessToken: token()
      })
      return mapSupplierDelayToUi(delay)
    },

    async listSupplierDelays() {
      const items = await request<Array<Parameters<typeof mapSupplierDelayToUi>[0]>>(
        '/stock/supplier-delays',
        { accessToken: token(), params: { siteCode: siteCode() } }
      )
      return (items ?? []).map(mapSupplierDelayToUi)
    },

    async createReturnMovement(materialId, quantity, reason) {
      const resolved = await resolveMaterialId(materialId)
      if (!resolved) throw new Error('NOT_FOUND')
      await request('/stock/movements', {
        method: 'POST',
        body: {
          materialId: resolved,
          siteCode: siteCode(),
          type: 'IN',
          quantity,
          reason: reason ?? 'Retour article'
        },
        accessToken: token()
      })
    }
  }
}
