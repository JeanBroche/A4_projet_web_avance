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
  const existingSite = await prisma.site.findFirst({
    where: { code: "SITE-LYO", deletedAt: null }
  });
  const site = existingSite
    ? await prisma.site.update({
        where: { id: existingSite.id },
        data: { name: "Site Lyon", isActive: true }
      })
    : await prisma.site.create({
        data: { code: "SITE-LYO", name: "Site Lyon", isActive: true }
      });

  for (const role of ROLES) {
    const existingRole = await prisma.role.findFirst({
      where: { code: role.code, deletedAt: null }
    });
    if (existingRole) {
      await prisma.role.update({
        where: { id: existingRole.id },
        data: { label: role.label }
      });
    } else {
      await prisma.role.create({ data: role });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existingAdmin = await prisma.user.findFirst({
    where: { email: "admin@aeronexis.local", deletedAt: null }
  });
  const admin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          passwordHash,
          firstName: "Admin",
          lastName: "Aeronexis",
          siteId: site.id,
          isActive: true
        }
      })
    : await prisma.user.create({
        data: {
          email: "admin@aeronexis.local",
          passwordHash,
          firstName: "Admin",
          lastName: "Aeronexis",
          siteId: site.id,
          isActive: true
        }
      });

  const adminRole = await prisma.role.findFirstOrThrow({
    where: { code: "admin", deletedAt: null }
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
