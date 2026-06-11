import { toNumericId } from '~/lib/mappers/id'

export function resolveStringIdByNumeric<T extends Record<string, unknown>>(
  items: T[],
  numericId: number | string,
  idField: keyof T = 'id' as keyof T
): string | null {
  const target = Number(numericId)
  for (const item of items) {
    const raw = item[idField]
    if (typeof raw === 'string' && toNumericId(raw) === target) {
      return raw
    }
    if (typeof raw === 'number' && raw === target) {
      return String(raw)
    }
  }
  return null
}

export function isCuidLike(value: string) {
  return value.length > 8 && !/^\d+$/.test(value)
}
