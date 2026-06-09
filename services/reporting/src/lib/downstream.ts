import type { Context } from "moleculer";

export async function callDownstream<T>(
  ctx: Context,
  action: string,
  params: Record<string, unknown>,
  accessToken?: string | null
): Promise<T> {
  const token = accessToken ?? (ctx.params as { accessToken?: string })?.accessToken;
  const payload: Record<string, unknown> = { ...params };
  if (token) {
    payload.accessToken = token;
  }
  return ctx.call<T, Record<string, unknown>>(action, payload);
}
