import type { Service, ServiceSchema } from "moleculer";
import { ensureRedisConnected, getRedisClient } from "@aeronexis/redis-infra";
import { initAuthAuditWriter } from "../src/lib/audit.js";
import {
  loginAction,
  refreshAction,
  logoutAction,
  meAction,
  userListAction,
  userCreateAction,
  userUpdateAction,
  roleListAction,
} from './actions/index.js';

const AuthService: ServiceSchema = {
  name: "auth",

  started(this: Service) {
    initAuthAuditWriter(this);
    const redis = getRedisClient(this.logger);
    if (redis) {
      void ensureRedisConnected(redis).catch((error) => {
        this.logger.warn("Redis pre-connect failed", {
          message: error instanceof Error ? error.message : String(error)
        });
      });
    }
  },

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info('Ping', {
          correlationId: ctx.meta.correlationId,
        });

        return 'pong';
      },
    },

    login: loginAction,

    refresh: refreshAction,

    logout: logoutAction,

    me: meAction,

    'user.list': userListAction,

    'user.create': userCreateAction,

    'user.update': userUpdateAction,

    'role.list': roleListAction,
  },
};

export default AuthService;
