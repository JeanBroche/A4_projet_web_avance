import { useApiClient } from '~/lib/api/client'
import type { ProductionAdapter } from '~/lib/adapters/types'
import {
  mapBatchToUi,
  mapBomToUi,
  mapProductToUi,
  mapUiBatchStatus,
  mapUiBomStatus
} from '~/lib/mappers/production'
import { isCuidLike, resolveStringIdByNumeric } from '~/lib/mappers/resolve-id'
import { toNumericId } from '~/lib/mappers/id'

const PRODUCT_CODES_KEY = 'aeronexis-product-codes'

function loadProductCodes(): Set<string> {
  if (!import.meta.client) return new Set()
  try {
    const raw = sessionStorage.getItem(PRODUCT_CODES_KEY)
    return new Set(raw ? JSON.parse(raw) as string[] : [])
  } catch {
    return new Set()
  }
}

function saveProductCode(code: string) {
  if (!import.meta.client) return
  const codes = loadProductCodes()
  codes.add(code)
  sessionStorage.setItem(PRODUCT_CODES_KEY, JSON.stringify([...codes]))
}

export function createMoleculerProductionAdapter(
  getSiteCode: () => string
): ProductionAdapter {
  const { request } = useApiClient()
  const siteCode = () => getSiteCode()

  async function listRawBatches() {
    const result = await request<{ items: Array<Record<string, unknown>> }>(
      '/production/batches',
      { params: { siteCode: siteCode() } }
    )
    return result.items ?? []
  }

  async function resolveBomCode(id: number | string): Promise<string | null> {
    const listed = await request<{ items: Array<Record<string, unknown>> }>(
      '/production/bom',
      { params: { siteCode: siteCode() } }
    )
    const items = listed.items ?? []
    if (isCuidLike(String(id))) {
      const match = items.find(b => b.id === String(id))
      return (match?.bom_code as string) ?? null
    }
    const match = items.find(b => toNumericId(String(b.id)) === Number(id))
    return (match?.bom_code as string) ?? null
  }

  async function resolveBatchCode(id: number | string): Promise<string | null> {
    const items = await listRawBatches()
    if (isCuidLike(String(id))) {
      const match = items.find(b => b.batch_id === String(id))
      return (match?.batch_code as string) ?? null
    }
    const match = items.find(b => toNumericId(String(b.batch_id)) === Number(id))
    return (match?.batch_code as string) ?? null
  }

  async function resolveBatchId(id: number | string): Promise<string | null> {
    if (isCuidLike(String(id))) return String(id)
    const items = await listRawBatches()
    return resolveStringIdByNumeric(items, id, 'batch_id')
  }

  async function batchHasOpenAnomaly(batchCode: string): Promise<boolean> {
    const history = await request<{ items?: Array<{ action?: string, details?: string }> }>(
      `/production/batches/${encodeURIComponent(batchCode)}/history`,
      { params: { limit: 50 } }
    )
    const reported = (history.items ?? []).filter(h => h.action === 'batch.anomaly_reported')
    const closed = new Set(
      (history.items ?? [])
        .filter(h => h.action === 'batch.anomaly_updated')
        .map(h => h.details?.split(' -> ')[0])
    )
    return reported.some(h => h.details && !closed.has(h.details))
  }

  return {
    async listBomOrders() {
      const result = await request<{ items: Array<Parameters<typeof mapBomToUi>[0]> }>(
        '/production/bom',
        { params: { siteCode: siteCode() } }
      )
      return (result.items ?? []).map(mapBomToUi)
    },

    async createBomOrder(input) {
      const bom = await request<Parameters<typeof mapBomToUi>[0]>('/production/bom', {
        method: 'POST',
        body: {
          description: input.name,
          quantity: input.qty,
          siteCode: siteCode(),
          lines: input.bom.map(line => ({
            material_id: line.reference,
            quantity: line.qtyNeeded
          }))
        }
      })
      return mapBomToUi(bom)
    },

    async updateBomOrder(input) {
      const bomCode = await resolveBomCode(input.id)
      if (!bomCode) throw new Error('NOT_FOUND')
      const bom = await request<Parameters<typeof mapBomToUi>[0]>(
        `/production/bom/${encodeURIComponent(bomCode)}`,
        {
          method: 'PATCH',
          body: {
            lines: input.bom.map(line => ({
              material_id: line.reference,
              quantity: line.qtyNeeded
            }))
          }
        }
      )
      return mapBomToUi(bom)
    },

    async updateBomOrderStatus(id, status) {
      const bomCode = await resolveBomCode(id)
      if (!bomCode) throw new Error('NOT_FOUND')
      const bom = await request<Parameters<typeof mapBomToUi>[0]>(
        `/production/bom/${encodeURIComponent(bomCode)}`,
        {
          method: 'PATCH',
          body: { status: mapUiBomStatus(status) }
        }
      )
      return mapBomToUi(bom)
    },

    async listBatches() {
      const items = await listRawBatches()
      const batches = await Promise.all(
        items.map(async (b) => {
          const batchCode = String(b.batch_code)
          const hasAnomaly = await batchHasOpenAnomaly(batchCode)
          return mapBatchToUi({ ...b, hasAnomaly } as Parameters<typeof mapBatchToUi>[0])
        })
      )
      return batches
    },

    async createBatch(input) {
      const boms = await request<{ items: Array<Record<string, unknown>> }>(
        '/production/bom',
        { params: { siteCode: siteCode() } }
      )
      const bomMatch = boms.items?.find(b => String(b.description ?? '').includes(input.ofNumber))
        ?? boms.items?.[0]
      const bomCode = bomMatch?.bom_code as string | undefined
      if (!bomCode) throw new Error('NOT_FOUND')
      const batch = await request<Parameters<typeof mapBatchToUi>[0]>('/production/batches', {
        method: 'POST',
        body: {
          bom_code: bomCode,
          command_id: input.ofNumber,
          siteCode: siteCode()
        }
      })
      return mapBatchToUi(batch)
    },

    async updateBatchStatus(id, status) {
      const batchCode = await resolveBatchCode(id)
      if (!batchCode) throw new Error('NOT_FOUND')
      const mapped = mapUiBatchStatus(status)
      const updated = mapped === 'COMPLETED'
        ? await request<Parameters<typeof mapBatchToUi>[0]>(
            `/production/batches/${encodeURIComponent(batchCode)}/progress`,
            { method: 'PATCH', body: { percent: 100 } }
          )
        : await request<Parameters<typeof mapBatchToUi>[0]>(
            `/production/batches/${encodeURIComponent(batchCode)}`,
            { method: 'PATCH', body: { status: mapped } }
          )
      return mapBatchToUi(updated)
    },

    async reportAnomaly(input) {
      const batchId = await resolveBatchId(input.batchId)
      if (!batchId) throw new Error('NOT_FOUND')
      await request(`/production/batches/${encodeURIComponent(batchId)}/anomalies`, {
        method: 'POST',
        body: { description: input.description }
      })
      const batchCode = await resolveBatchCode(input.batchId)
      if (!batchCode) throw new Error('NOT_FOUND')
      const batch = await request<Parameters<typeof mapBatchToUi>[0]>(
        `/production/batches/${encodeURIComponent(batchCode)}`,
        {}
      )
      return mapBatchToUi({ ...batch, hasAnomaly: true })
    },

    async clearAnomaly(batchId) {
      const batchIdCuid = await resolveBatchId(batchId)
      const batchCode = await resolveBatchCode(batchId)
      if (!batchIdCuid || !batchCode) throw new Error('NOT_FOUND')
      const history = await request<{ items?: Array<{ action?: string, details?: string }> }>(
        `/production/batches/${encodeURIComponent(batchCode)}/history`,
        { params: { limit: 50 } }
      )
      const anomalyCode = (history.items ?? []).find(h => h.action === 'batch.anomaly_reported')?.details
      if (anomalyCode) {
        await request(
          `/production/batches/${encodeURIComponent(batchIdCuid)}/anomalies/${encodeURIComponent(anomalyCode)}`,
          {
            method: 'PATCH',
            body: { status: 'CLOSED' }
          }
        )
      }
      const batch = await request<Parameters<typeof mapBatchToUi>[0]>(
        `/production/batches/${encodeURIComponent(batchCode)}`,
        {}
      )
      return mapBatchToUi({ ...batch, hasAnomaly: false })
    },

    async listProducts() {
      const codes = [...loadProductCodes()]
      const products = await Promise.all(
        codes.map(async (code) => {
          try {
            return await request<Parameters<typeof mapProductToUi>[0]>(
              `/production/products/${encodeURIComponent(code)}`,
              {}
            )
          } catch {
            return null
          }
        })
      )
      return products.filter(Boolean).map(p => mapProductToUi(p!))
    },

    async getProduct(productCode) {
      const product = await request<Parameters<typeof mapProductToUi>[0]>(
        `/production/products/${encodeURIComponent(productCode)}`,
        {}
      )
      saveProductCode(productCode)
      return mapProductToUi(product)
    },

    async createProduct(input) {
      const product = await request<Parameters<typeof mapProductToUi>[0]>('/production/products', {
        method: 'POST',
        body: { ...input, siteCode: input.siteCode ?? siteCode() }
      })
      saveProductCode(input.productCode)
      return mapProductToUi(product)
    },

    async updateProduct(input) {
      const product = await request<Parameters<typeof mapProductToUi>[0]>(
        `/production/products/${encodeURIComponent(input.productCode)}`,
        {
          method: 'PATCH',
          body: input
        }
      )
      saveProductCode(input.productCode)
      return mapProductToUi(product)
    },

    async deleteProduct(productCode) {
      await request(`/production/products/${encodeURIComponent(productCode)}`, {
        method: 'DELETE'
      })
      if (import.meta.client) {
        const codes = loadProductCodes()
        codes.delete(productCode)
        sessionStorage.setItem(PRODUCT_CODES_KEY, JSON.stringify([...codes]))
      }
    }
  }
}
