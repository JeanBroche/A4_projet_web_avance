type SoftDeletePrisma = {
  // Prisma namespace differs per generated client; keep the API surface loose.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defineExtension: (extension: any) => any;
  getExtensionContext: (context: unknown) => unknown;
};
const SOFT_DELETE_MODELS = new Set([
  "Site",
  "User",
  "Role",
  "Material",
  "Client",
  "ProductStock",
  "Delivery"
]);

function isSoftDeleteModel(model: string | undefined): boolean {
  return model !== undefined && SOFT_DELETE_MODELS.has(model);
}

function withActiveOnly<T extends { where?: Record<string, unknown> }>(args: T): T {
  return {
    ...args,
    where: {
      deletedAt: null,
      ...args.where
    }
  };
}

type QueryExtensionContext<TArgs = Record<string, unknown>> = {
  model: string | undefined;
  args: TArgs;
  query: (args: TArgs) => Promise<unknown>;
};

/**
 * Prisma client extension: delete -> set deletedAt, reads exclude soft-deleted rows.
 * Pass the Prisma namespace from the generated client of each microservice.
 */
export function createSoftDeleteExtension(Prisma: SoftDeletePrisma) {
  return Prisma.defineExtension({
    name: "softDelete",
    query: {
      $allModels: {
        async findMany({ model, args, query }: QueryExtensionContext) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }
          return query(withActiveOnly(args));
        },
        async findFirst({ model, args, query }: QueryExtensionContext) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }
          return query(withActiveOnly(args));
        },
        async findUnique({ model, args, query }: QueryExtensionContext) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }
          const result = await query(args);
          if (result && typeof result === "object" && "deletedAt" in result && result.deletedAt) {
            return null;
          }
          return result;
        },
        async count({ model, args, query }: QueryExtensionContext) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }
          return query(withActiveOnly(args));
        }
      }
    },
    model: {
      $allModels: {
        async delete(this: unknown, args: { where: Record<string, unknown> }) {
          const context = Prisma.getExtensionContext(this) as {
            update: (input: {
              where: Record<string, unknown>;
              data: { deletedAt: Date };
            }) => Promise<unknown>;
          };
          return context.update({
            where: args.where,
            data: { deletedAt: new Date() }
          });
        },
        async deleteMany(this: unknown, args: { where?: Record<string, unknown> }) {
          const context = Prisma.getExtensionContext(this) as {
            updateMany: (input: {
              where?: Record<string, unknown>;
              data: { deletedAt: Date };
            }) => Promise<{ count: number }>;
          };
          return context.updateMany({
            where: {
              deletedAt: null,
              ...args.where
            },
            data: { deletedAt: new Date() }
          });
        }
      }
    }
  });
}
