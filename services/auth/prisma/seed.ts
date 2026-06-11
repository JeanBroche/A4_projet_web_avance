import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  SEED_SITES,
  SEED_USER_IDS,
  SEED_USERS,
  type SeedUserRole
} from "@aeronexis/shared";
import { prisma } from "../src/db.js";

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

const ROLES = [
  { code: "operateur", label: "Operateur production" },
  { code: "logistique", label: "Logistique" },
  { code: "commercial", label: "Commercial" },
  { code: "direction", label: "Direction" },
  { code: "admin", label: "Administrateur" }
] as const;

const SITES = [
  { code: SEED_SITES.LYO, name: "Site Lyon" },
  { code: SEED_SITES.PAR, name: "Site Paris" }
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

async function upsertSeedUser(role: SeedUserRole, siteId: string) {
  const def = SEED_USERS[role];
  const userId = SEED_USER_IDS[role];
  const passwordHash = await bcrypt.hash(password, 10);

  const byEmail = await prisma.user.findFirst({
    where: { email: def.email, deletedAt: null }
  });
  if (byEmail && byEmail.id !== userId) {
    await prisma.userRole.deleteMany({ where: { userId: byEmail.id } });
    await prisma.user.update({
      where: { id: byEmail.id },
      data: { deletedAt: new Date(), isActive: false }
    });
  }

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {
      email: def.email,
      passwordHash,
      firstName: def.firstName,
      lastName: def.lastName,
      siteId,
      isActive: true,
      deletedAt: null
    },
    create: {
      id: userId,
      email: def.email,
      passwordHash,
      firstName: def.firstName,
      lastName: def.lastName,
      siteId,
      isActive: true
    }
  });

  const roleRow = await prisma.role.findFirstOrThrow({
    where: { code: role, deletedAt: null }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: roleRow.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: roleRow.id
    }
  });

  return user;
}

async function main() {
  const sites = new Map<string, string>();
  for (const entry of SITES) {
    const row = await upsertSite(entry.code, entry.name);
    sites.set(entry.code, row.id);
  }
  const lyoSiteId = sites.get(SEED_SITES.LYO)!;

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

  const seededUsers: string[] = [];
  for (const role of Object.keys(SEED_USERS) as SeedUserRole[]) {
    const user = await upsertSeedUser(role, lyoSiteId);
    seededUsers.push(user.email);
  }

  console.log("Auth seed completed:", {
    sites: SITES.map((s) => s.code),
    roles: ROLES.length,
    users: seededUsers
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
