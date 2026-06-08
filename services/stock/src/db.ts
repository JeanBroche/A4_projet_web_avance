import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient, createSoftDeleteExtension } from "@aeronexis/db";
import { PrismaClient, Prisma } from "./generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
const client = createPrismaClient(PrismaClient, process.env.STOCK_DATABASE_URL);
export const prisma = client.$extends(createSoftDeleteExtension(Prisma));