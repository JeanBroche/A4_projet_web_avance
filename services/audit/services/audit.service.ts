import type { Service, ServiceSchema } from "moleculer";
import { connectMongo, disconnectMongo, ensureIndexes } from "../src/db.js";
import { auditActions } from "./actions/index.js";
import { userActionLoggedEvent } from "./events/user-action-logged.js";

const AuditService: ServiceSchema = {
  name: "audit",

  async started(this: Service) {
    const db = await connectMongo();
    await ensureIndexes(db);
    this.logger.info("Audit service started", { mongo: "connected" });
  },

  async stopped() {
    await disconnectMongo();
  },

  events: {
    "user.action.logged": userActionLoggedEvent
  },

  actions: auditActions
};

export default AuditService;
