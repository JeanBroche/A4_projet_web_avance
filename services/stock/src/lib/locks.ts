import { withDistributedLock, type RedisLogger } from "@aeronexis/redis-infra";

export async function withMaterialLocks<T>(
  materialIds: string[],
  fn: () => Promise<T>,
  logger?: RedisLogger
): Promise<T> {
  const sorted = [...new Set(materialIds)].sort();
  if (sorted.length === 0) {
    return fn();
  }

  const [head, ...tail] = sorted;
  return withDistributedLock(
    { key: `lock:stock:material:${head}`, logger },
    () => withMaterialLocks(tail, fn, logger)
  );
}
