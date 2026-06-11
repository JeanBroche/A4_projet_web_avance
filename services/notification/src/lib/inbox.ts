import { randomUUID } from "node:crypto";
import { getRedisClient } from "@aeronexis/redis-infra";
import type { NotificationInput, NotificationRecord } from "./types.js";
import { normalizeNotification } from "./rules.js";

const MAX_INBOX = 500;
const DEDUP_TTL_SECONDS = 3600;

const memoryInboxes = new Map<string, NotificationRecord[]>();
const memoryDedup = new Map<string, number>();

function inboxKey(siteCode: string) {
  return `notification:inbox:${siteCode}`;
}

function dedupKey(siteCode: string, key: string) {
  return `notification:dedup:${siteCode}:${key}`;
}

export function resetInboxStore() {
  memoryInboxes.clear();
  memoryDedup.clear();
}

function readMemoryInbox(siteCode: string) {
  if (!memoryInboxes.has(siteCode)) {
    memoryInboxes.set(siteCode, []);
  }
  return memoryInboxes.get(siteCode)!;
}

async function isDuplicate(siteCode: string, key: string): Promise<boolean> {
  const client = getRedisClient();
  if (client) {
    const result = await client.set(
      dedupKey(siteCode, key),
      "1",
      "EX",
      DEDUP_TTL_SECONDS,
      "NX"
    );
    return result === null;
  }

  const fullKey = dedupKey(siteCode, key);
  const expiresAt = memoryDedup.get(fullKey);
  if (expiresAt && expiresAt > Date.now()) {
    return true;
  }
  memoryDedup.set(fullKey, Date.now() + DEDUP_TTL_SECONDS * 1000);
  return false;
}

export async function appendNotification(
  input: NotificationInput,
  dedup?: string
): Promise<NotificationRecord | null> {
  const normalized = normalizeNotification(input);

  if (dedup && (await isDuplicate(normalized.siteCode, dedup))) {
    return null;
  }

  const record: NotificationRecord = {
    id: randomUUID(),
    read: false,
    createdAt: new Date().toISOString(),
    ...normalized
  };

  const client = getRedisClient();
  if (client) {
    await client.lpush(inboxKey(normalized.siteCode), JSON.stringify(record));
    await client.ltrim(inboxKey(normalized.siteCode), 0, MAX_INBOX - 1);
    return record;
  }

  const inbox = readMemoryInbox(normalized.siteCode);
  inbox.unshift(record);
  if (inbox.length > MAX_INBOX) {
    inbox.length = MAX_INBOX;
  }
  return record;
}

export async function listInbox(
  siteCode: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<NotificationRecord[]> {
  const limit = options?.limit ?? 50;
  const client = getRedisClient();

  let items: NotificationRecord[];
  if (client) {
    const raw = await client.lrange(inboxKey(siteCode), 0, limit - 1);
    items = raw.map((entry) => JSON.parse(entry) as NotificationRecord);
  } else {
    items = readMemoryInbox(siteCode).slice(0, limit);
  }

  if (options?.unreadOnly) {
    return items.filter((item) => !item.read);
  }
  return items;
}

export async function markNotificationRead(
  siteCode: string,
  notificationId: string
): Promise<NotificationRecord | null> {
  const client = getRedisClient();

  if (client) {
    const raw = await client.lrange(inboxKey(siteCode), 0, MAX_INBOX - 1);
    let updated: NotificationRecord | null = null;
    const next = raw.map((entry) => {
      const item = JSON.parse(entry) as NotificationRecord;
      if (item.id !== notificationId) {
        return item;
      }
      updated = { ...item, read: true };
      return updated;
    });
    if (!updated) {
      return null;
    }
    const pipeline = client.pipeline();
    pipeline.del(inboxKey(siteCode));
    for (const item of next) {
      pipeline.rpush(inboxKey(siteCode), JSON.stringify(item));
    }
    await pipeline.exec();
    return updated;
  }

  const inbox = readMemoryInbox(siteCode);
  const index = inbox.findIndex((item) => item.id === notificationId);
  if (index < 0) {
    return null;
  }
  inbox[index] = { ...inbox[index], read: true };
  return inbox[index];
}

export async function countUnread(siteCode: string): Promise<number> {
  const items = await listInbox(siteCode, { limit: MAX_INBOX });
  return items.filter((item) => !item.read).length;
}
