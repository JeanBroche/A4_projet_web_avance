/** Stable positive integer from a string id (cuid, uuid, etc.). */
export function toNumericId(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash || 1
}
