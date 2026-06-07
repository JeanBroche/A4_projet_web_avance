import type { ServiceSchema } from 'moleculer';

import { loginAction } from './actions/loginAction.js';
import { refreshAction } from './actions/refreshAction.js';
import { logoutAction } from './actions/logoutAction.js';
import { meAction } from './actions/meAction.js';
import { userListAction } from './actions/userListAction.js';
import { userCreateAction } from './actions/userCreateAction.js';
import { userUpdateAction } from './actions/userUpdateAction.js';
import { roleListAction } from './actions/roleListAction.js';


const AuthService: ServiceSchema = {
  name: 'auth',

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
