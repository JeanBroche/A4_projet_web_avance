"use strict";

/**
 * Template de schema Moleculer pour les futurs services metier.
 * Copier ce fichier vers services/<domaine>/services/<domaine>.service.js
 * puis adapter name, actions et params.
 */
module.exports = {
  name: "example",
  version: 1,

  actions: {
    example: {
      params: {
        id: { type: "string", optional: false }
      },
      async handler(ctx) {
        this.logger.info("Action example", {
          correlationId: ctx.meta.correlationId,
          id: ctx.params.id
        });

        return { id: ctx.params.id };
      }
    }
  }
};
