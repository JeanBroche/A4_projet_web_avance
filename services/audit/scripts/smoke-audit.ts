import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ServiceBroker } from "moleculer";
import jwt, { type SignOptions } from "jsonwebtoken";
import moleculerConfig from "../moleculer.config.js";
import auditService from "../services/audit.service.js";
import { connectMongo, disconnectMongo } from "../src/db.js";
import { DEMO_LOT_ID } from "../src/lib/audit-helpers.js";
import type { UserActionLoggedPayload } from "@aeronexis/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
process.env.JWT_SECRET ??= "ci-test-jwt-secret";

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "smoke-audit",
  transporter: null,
  logger: false
});

function signAdminToken() {
  return jwt.sign(
    {
      sub: "smoke-admin",
      email: "admin@aeronexis.test",
      siteId: "SITE-LYO",
      roles: ["admin"]
    },
    process.env.JWT_SECRET!,
    { expiresIn: "5m" as SignOptions["expiresIn"] }
  );
}

broker.createService(auditService);

async function main() {
  await connectMongo();
  await broker.start();

  const accessToken = signAdminToken();
  const ping = await broker.call("audit.ping");
  if (ping !== "pong") {
    throw new Error("audit.ping failed");
  }

  const auditPayload: UserActionLoggedPayload = {
    action: "smoke.test.action",
    actorId: "smoke-admin",
    actorEmail: "admin@aeronexis.test",
    entity: "SmokeTest",
    entityId: "smoke-1",
    siteCode: "SITE-LYO",
    timestamp: new Date().toISOString()
  };
  await broker.emit("user.action.logged", auditPayload);

  const changes = (await broker.call("audit.change.list", {
    accessToken,
    entity: "SmokeTest"
  })) as { items: unknown[] };

  const critical = await broker.call("audit.event.record", {
    accessToken,
    severity: "WARNING",
    type: "smoke.test",
    message: "Smoke critical event"
  });

  const trace = await broker.call("audit.lot.trace", {
    accessToken,
    lotId: DEMO_LOT_ID
  });

  const exported = (await broker.call("audit.lot.export", {
    accessToken,
    lotId: DEMO_LOT_ID
  })) as { format: string; filename: string; content: string };

  console.log(
    JSON.stringify(
      {
        ping,
        changeCount: changes.items.length,
        critical,
        traceSummary: (trace as { summary: unknown }).summary,
        export: { format: exported.format, filename: exported.filename, lines: exported.content.split("\n").length }
      },
      null,
      2
    )
  );

  await broker.stop();
  await disconnectMongo();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await broker.stop().catch(() => {});
  await disconnectMongo().catch(() => {});
  process.exit(1);
});
