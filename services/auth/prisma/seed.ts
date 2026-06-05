import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) {
  throw new Error("SEED_ADMIN_PASSWORD is required to run the auth seed.");
}

const prisma = createPrismaClient(PrismaClient);

const ROLES = [
  { code: "operateur", label: "Operateur production" },
  { code: "logistique", label: "Logistique" },
  { code: "commercial", label: "Commercial" },
  { code: "direction", label: "Direction" },
  { code: "admin", label: "Administrateur" }
] as const;

async function main() {
  const site = await prisma.site.upsert({
    where: { code: "SITE-LYO" },
    update: { name: "Site Lyon", isActive: true },
    create: {
      code: "SITE-LYO",
      name: "Site Lyon",
      isActive: true
    }
  });

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { label: role.label },
      create: role
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@aeronexis.local" },
    update: {
      passwordHash,
      firstName: "Admin",
      lastName: "Aeronexis",
      siteId: site.id,
      isActive: true
    },
    create: {
      email: "admin@aeronexis.local",
      passwordHash,
      firstName: "Admin",
      lastName: "Aeronexis",
      siteId: site.id,
      isActive: true
    }
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "admin" }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id
    }
  });

  console.log("Auth seed completed:", {
    site: site.code,
    roles: ROLES.length,
    admin: admin.email
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
