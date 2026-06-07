import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export type PrismaClientConstructor<T> = new (options: {
  adapter: PrismaPg;
}) => T;

export function createPrismaClient<T>(
  Client: PrismaClientConstructor<T>,
  connectionString = process.env.POSTGRES_URL
): T {
  if (!connectionString) {
    throw new Error("POSTGRES_URL is required to create a Prisma client.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new Client({ adapter });
}
