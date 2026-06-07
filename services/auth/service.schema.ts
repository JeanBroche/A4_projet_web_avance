import type { ServiceSchema } from "moleculer";

/**
 * Template de schema Moleculer pour les futurs services metier.
 * Copier ce fichier vers services/<domaine>/services/<domaine>.service.ts
 * puis adapter name, actions et params.
 */
const ExampleService: ServiceSchema = {
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

export default ExampleService;
