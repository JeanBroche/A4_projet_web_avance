import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ServiceBroker } from "moleculer";
import moleculerConfig from "../moleculer.config.js";
import authService from "../services/auth.service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "smoke-auth",
  transporter: null
});

async function main() {
  broker.createService(authService);
  await broker.start();

  const email = "admin@aeronexis.local";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD is required.");
  }

  const login = await broker.call("auth.login", { email, password }) as {
    user: { email: string };
    roles: Array<{ code: string }>;
    accessToken: string;
    refreshToken: string;
  };
  console.log("login:", {
    email: login.user.email,
    roles: login.roles.map((role) => role.code),
    hasAccessToken: Boolean(login.accessToken),
    hasRefreshToken: Boolean(login.refreshToken)
  });

  const me = await broker.call("auth.me", { accessToken: login.accessToken }) as {
    user: { email: string };
  };
  console.log("me:", me.user.email);

  const refreshed = await broker.call("auth.refresh", {
    refreshToken: login.refreshToken
  }) as {
    user: { email: string };
    refreshToken: string;
    accessToken: string;
  };
  console.log("refresh:", {
    email: refreshed.user.email,
    rotated: refreshed.refreshToken !== login.refreshToken
  });

  await broker.call("auth.logout", { refreshToken: refreshed.refreshToken });
  console.log("logout: ok");

  const roles = await broker.call("auth.role.list", {
    accessToken: refreshed.accessToken
  }) as { roles: unknown[] };
  console.log("roles:", roles.roles.length);

  await broker.stop();
}

main().catch(async (error) => {
  console.error(error.message || error);
  await broker.stop().catch(() => {});
  process.exit(1);
});
