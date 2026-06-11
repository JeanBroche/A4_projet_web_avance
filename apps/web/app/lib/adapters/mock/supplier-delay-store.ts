import type { SupplierDelay, SupplierDelayInput } from '~/types'

const delaysStore: SupplierDelay[] = []

export function getMockSupplierDelays(): SupplierDelay[] {
  return delaysStore.map(d => ({ ...d, reportedAt: new Date(d.reportedAt) }))
}

export function addMockSupplierDelay(
  input: SupplierDelayInput,
  materialName: string
): SupplierDelay {
  const delay: SupplierDelay = {
    id: `delay-${Date.now()}`,
    materialReference: input.materialReference,
    materialName,
    supplier: input.supplier,
    delayDays: input.delayDays,
    reportedAt: new Date(),
    comment: input.comment
  }
  delaysStore.unshift(delay)
  return delay
}
