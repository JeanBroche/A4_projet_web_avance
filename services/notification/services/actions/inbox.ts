import type { Context } from "moleculer";
import {
  assertSiteAccess,
  parseParams,
  requireStockRead,
  resolveEffectiveSite
} from "@aeronexis/services-shared";
import { inboxListSchema, inboxMarkReadSchema } from "../../src/lib/schemas.js";
import { countUnread, listInbox, markNotificationRead } from "../../src/lib/inbox.js";

export const inboxListAction = {
  async handler(ctx: Context) {
    const params = parseParams(inboxListSchema, ctx.params);
    const auth = await requireStockRead(ctx, params.accessToken);
    const siteCode = resolveEffectiveSite(auth, params) ?? auth.siteId;
    if (!siteCode) {
      return { siteCode: null, total: 0, unreadCount: 0, items: [] };
    }
    assertSiteAccess(auth, siteCode);

    const items = await listInbox(siteCode, {
      unreadOnly: params.unreadOnly,
      limit: params.limit
    });
    const unreadCount = await countUnread(siteCode);

    return {
      siteCode,
      total: items.length,
      unreadCount,
      items
    };
  }
};

export const inboxMarkReadAction = {
  async handler(ctx: Context) {
    const params = parseParams(inboxMarkReadSchema, ctx.params);
    const auth = await requireStockRead(ctx, params.accessToken);
    const siteCode = resolveEffectiveSite(auth, params) ?? auth.siteId;
    if (!siteCode) {
      return { updated: false };
    }
    assertSiteAccess(auth, siteCode);

    const updated = await markNotificationRead(siteCode, params.notificationId);
    return { updated: Boolean(updated), notification: updated };
  }
};

export const inboxUnreadCountAction = {
  async handler(ctx: Context) {
    const params = parseParams(inboxListSchema, ctx.params);
    const auth = await requireStockRead(ctx, params.accessToken);
    const siteCode = resolveEffectiveSite(auth, params) ?? auth.siteId;
    if (!siteCode) {
      return { siteCode: null, unreadCount: 0 };
    }
    assertSiteAccess(auth, siteCode);
    return { siteCode, unreadCount: await countUnread(siteCode) };
  }
};
