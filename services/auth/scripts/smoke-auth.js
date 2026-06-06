"use strict";

const { config } = require("dotenv");
const { resolve } = require("path");
const { ServiceBroker } = require("moleculer");
const moleculerConfig = require("../moleculer.config.js");

config({ path: resolve(__dirname, "../../../.env") });

const broker = new ServiceBroker({
  ...moleculerConfig,
  nodeID: "smoke-auth",
  transporter: null
});

async function main() {
  broker.createService(require("../services/auth.service.js"));
  await broker.start();

  const email = "admin@aeronexis.local";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD is required.");
  }

  const login = await broker.call("auth.login", { email, password });
  console.log("login:", {
    email: login.user.email,
    roles: login.roles.map((role) => role.code),
    hasAccessToken: Boolean(login.accessToken),
    hasRefreshToken: Boolean(login.refreshToken)
  });

  const me = await broker.call("auth.me", { accessToken: login.accessToken });
  console.log("me:", me.user.email);

  const refreshed = await broker.call("auth.refresh", {
    refreshToken: login.refreshToken
  });
  console.log("refresh:", {
    email: refreshed.user.email,
    rotated: refreshed.refreshToken !== login.refreshToken
  });

  await broker.call("auth.logout", { refreshToken: refreshed.refreshToken });
  console.log("logout: ok");

  const roles = await broker.call("auth.role.list", {
    accessToken: refreshed.accessToken
  });
  console.log("roles:", roles.roles.length);

  await broker.stop();
}

main().catch(async (error) => {
  console.error(error.message || error);
  await broker.stop().catch(() => {});
  process.exit(1);
});
