import type { Prisma } from "../generated/prisma/client.js";

export const userInclude = {
  roles: { include: { role: true } },
  site: true
} satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{
  include: typeof userInclude;
}>;

export function mapRoles(user: Pick<UserWithRoles, "roles"> | null | undefined) {
  return (user?.roles || []).map(({ role }) => ({
    code: role.code,
    label: role.label
  }));
}

export function mapUser(user: UserWithRoles) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    siteId: user.siteId,
    isActive: user.isActive,
    roles: mapRoles(user)
  };
}

export function buildAccessTokenPayload(user: UserWithRoles) {
  return {
    sub: user.id,
    email: user.email,
    siteId: user.site?.code ?? null,
    roles: mapRoles(user).map((role) => role.code)
  };
}
