import { SEED_MATERIAL_LABELS } from '@aeronexis/shared'
import type { StockLevel } from '~/types'

export type MaterialReferenceOption = {
  label: string
  value: string
  name: string
  available: number
  unit: string
}

/** Options pour les sélecteurs BOM : catalogue AERONEXIS + stock live du site. */
export function buildMaterialReferenceOptions(levels: StockLevel[]): MaterialReferenceOption[] {
  const byRef = new Map<string, MaterialReferenceOption>()

  for (const [code, meta] of Object.entries(SEED_MATERIAL_LABELS)) {
    byRef.set(code, {
      label: `${code} — ${meta.name}`,
      value: code,
      name: meta.name,
      available: 0,
      unit: meta.unit
    })
  }

  for (const level of levels) {
    byRef.set(level.reference, {
      label: `${level.reference} — ${level.name}`,
      value: level.reference,
      name: level.name,
      available: level.available,
      unit: level.unit
    })
  }

  return [...byRef.values()].sort((a, b) => a.value.localeCompare(b.value))
}
