import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

function requireSeedPassword(): string {
  const value = process.env.SEED_ADMIN_PASSWORD;
  if (!value) {
    throw new Error("SEED_ADMIN_PASSWORD is required to run the auth seed.");
  }
  return value;
}

const password = requireSeedPassword();

const prisma = createPrismaClient(PrismaClient, process.env.AUTH_DATABASE_URL);

const ROLES = [
  { code: "operateur", label: "Operateur production" },
  { code: "logistique", label: "Logistique" },
  { code: "commercial", label: "Commercial" },
  { code: "direction", label: "Direction" },
  { code: "admin", label: "Administrateur" }
] as const;

const SITES = [
  { code: "SITE-LYO", name: "Site Lyon" },
  { code: "SITE-PAR", name: "Site Paris" }
] as const;

async function upsertSite(code: string, name: string) {
  const existing = await prisma.site.findFirst({
    where: { code, deletedAt: null }
  });

  if (existing) {
    return prisma.site.update({
      where: { id: existing.id },
      data: { name, isActive: true }
    });
  }

  return prisma.site.create({ data: { code, name, isActive: true } });
}

async function main() {
  const sites = new Map<string, string>();
  for (const entry of SITES) {
    const row = await upsertSite(entry.code, entry.name);
    sites.set(entry.code, row.id);
  }
  const site = { id: sites.get("SITE-LYO")!, code: "SITE-LYO" };

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

  const logisticEmail = "logistique@aeronexis.local";
  const logisticHash = await bcrypt.hash(password, 10);
  const existingLogistic = await prisma.user.findFirst({
    where: { email: logisticEmail, deletedAt: null }
  });
  const logistic = existingLogistic
    ? await prisma.user.update({
        where: { id: existingLogistic.id },
        data: {
          passwordHash: logisticHash,
          firstName: "Logistique",
          lastName: "Aeronexis",
          siteId: site.id,
          isActive: true
        }
      })
    : await prisma.user.create({
        data: {
          email: logisticEmail,
          passwordHash: logisticHash,
          firstName: "Logistique",
          lastName: "Aeronexis",
          siteId: site.id,
          isActive: true
        }
      });

  const logisticRole = await prisma.role.findFirstOrThrow({
    where: { code: "logistique", deletedAt: null }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: logistic.id,
        roleId: logisticRole.id
      }
    },
    update: {},
    create: {
      userId: logistic.id,
      roleId: logisticRole.id
    }
  });

  console.log("Auth seed completed:", {
    sites: SITES.map((s) => s.code),
    roles: ROLES.length,
    users: [admin.email, logistic.email]
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
