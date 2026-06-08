import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export type PrismaClientConstructor<T> = new (options: {
  adapter: PrismaPg;
}) => T;

export function createPrismaClient<T>(
  Client: PrismaClientConstructor<T>,
  connectionString?: string
): T {
  if (!connectionString) {
    throw new Error(
      "A connection string is required to create a Prisma client. " +
        "Chaque microservice doit passer son URL dediee (ex. process.env.AUTH_DATABASE_URL)."
    );
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new Client({ adapter });
}
