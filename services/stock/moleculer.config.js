"use strict";

const { createConfig } = require("@aeronexis/moleculer-config");

module.exports = createConfig({
  nodeID: process.env.NODE_ID || "stock"
});
