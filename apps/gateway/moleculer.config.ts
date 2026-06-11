import { createConfig } from "@aeronexis/moleculer-config";

export default createConfig({
  nodeID: process.env.NODE_ID || "gateway"
});
