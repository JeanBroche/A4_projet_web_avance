"use strict";

const path = require("path");

function loadEnv() {
  require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
  });
}

/**
 * @param {import("moleculer").BrokerOptions} [overrides]
 * @returns {import("moleculer").BrokerOptions}
 */
function createConfig(overrides = {}) {
  loadEnv();

  return {
    namespace: "aeronexis",
    nodeID: overrides.nodeID || null,
    logger: {
      type: "Console",
      options: {
        level: process.env.LOG_LEVEL || "info",
        formatter: "json",
        colors: false
      }
    },
    transporter: process.env.REDIS_URL || "redis://localhost:6379",
    serializer: "JSON",
    middlewares: [require("./middlewares/correlation-id")],
    ...overrides
  };
}

module.exports = { createConfig };
