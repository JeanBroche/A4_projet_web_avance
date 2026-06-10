import type { Service } from "moleculer";
import { withCache as withRedisCache } from "@aeronexis/redis-infra";

const TTL_SECONDS = 300;

export async function withCache<T>(
  service: Service,
  action: string,
  params: Record<string, unknown>,
  compute: () => Promise<T>
): Promise<T> {
  return withRedisCache(
    {
      namespace: `reporting:${action}`,
      keyParts: params,
      ttlSeconds: TTL_SECONDS,
      logger: service.logger
    },
    compute
  );
}
