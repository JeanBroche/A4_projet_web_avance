import type { Context, Service } from "moleculer";
import { Errors } from "moleculer";
import {
  clearAuthResponseCookies,
  getRefreshTokenFromRequest,
  setAuthResponseCookies
} from "../cookies.js";

const { MoleculerClientError } = Errors;

type HttpMeta = Record<string, unknown> & {
  $req?: { headers?: Record<string, string | string[] | undefined> };
};

type AuthTokensResult = {
  accessToken: string;
  refreshToken: string;
  user: unknown;
  roles?: unknown;
};

function getRequest(ctx: Context): { headers?: Record<string, string | string[] | undefined> } {
  const meta = ctx.meta as HttpMeta;
  return meta.$req ?? {};
}

export const authFacadeActions = {
  "auth.login": {
    async handler(this: Service, ctx: Context) {
      const result = (await ctx.call("auth.login", ctx.params)) as AuthTokensResult;
      setAuthResponseCookies(ctx.meta as Record<string, unknown>, result.accessToken, result.refreshToken);
      return {
        user: result.user,
        roles: result.roles
      };
    }
  },

  "auth.refresh": {
    async handler(this: Service, ctx: Context) {
      const refreshToken = getRefreshTokenFromRequest(getRequest(ctx));
      if (!refreshToken) {
        throw new MoleculerClientError("Missing refresh token cookie", 401, "TOKEN_INVALID");
      }

      const result = (await ctx.call("auth.refresh", { refreshToken })) as AuthTokensResult;
      setAuthResponseCookies(ctx.meta as Record<string, unknown>, result.accessToken, result.refreshToken);
      return {
        user: result.user,
        roles: result.roles
      };
    }
  },

  "auth.logout": {
    async handler(this: Service, ctx: Context) {
      const req = getRequest(ctx);
      const refreshToken = getRefreshTokenFromRequest(req);
      const meta = ctx.meta as Record<string, unknown>;

      if (refreshToken) {
        await ctx.call("auth.logout", {
          refreshToken,
          accessToken: typeof meta.accessToken === "string" ? meta.accessToken : undefined
        });
      }

      clearAuthResponseCookies(meta);
      return { success: true };
    }
  }
};
