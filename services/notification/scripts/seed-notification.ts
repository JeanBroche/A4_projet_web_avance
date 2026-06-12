import { config } from "dotenv";
import { resolve } from "node:path";
import { SEED_NOTIFICATIONS } from "@aeronexis/shared";
import { getRedisClient, resetRedisClient } from "@aeronexis/redis-infra";
import { appendNotification, markNotificationRead } from "../src/lib/inbox.js";
import type { NotificationRecord } from "../src/lib/types.js";

config({ path: resolve(import.meta.dirname, "../../../.env") });

function inboxKey(siteCode: string) {
  return `notification:inbox:${siteCode}`;
}

async function ensureRedisReady() {
  const client = getRedisClient();
  if (!client) {
    return;
  }
  if (client.status === "wait") {
    await client.connect();
  }
  await client.ping();
}

async function main() {
  try {
    await ensureRedisReady();
  } catch (error) {
    console.warn(
      "Redis unavailable for notification seed, using in-memory inbox:",
      error instanceof Error ? error.message : error
    );
  }

  const client = getRedisClient();
  const bySite = new Map<string, NotificationRecord[]>();

  for (const entry of SEED_NOTIFICATIONS) {
    const { dedup: _dedup, read, ...input } = entry;
    const record: NotificationRecord = {
      id: entry.id,
      ...input,
      read,
      createdAt: new Date("2026-01-21T10:00:00.000Z").toISOString()
    };
    const list = bySite.get(record.siteCode) ?? [];
    list.push(record);
    bySite.set(record.siteCode, list);
  }

  if (client) {
    for (const [siteCode, records] of bySite) {
      await client.del(inboxKey(siteCode));
      for (const record of [...records].reverse()) {
        await client.lpush(inboxKey(siteCode), JSON.stringify(record));
      }
    }
  } else {
    for (const entry of SEED_NOTIFICATIONS) {
      const { dedup, read, id: _id, ...input } = entry;
      const created = await appendNotification(input, dedup);
      if (created && read) {
        await markNotificationRead(entry.siteCode, created.id);
      }
    }
  }

  const total = SEED_NOTIFICATIONS.length;
  const readCount = SEED_NOTIFICATIONS.filter((n) => n.read).length;
  console.log("Notification seed completed:", {
    total,
    read: readCount,
    unread: total - readCount,
    sites: [...bySite.keys()]
  });
  resetRedisClient();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
