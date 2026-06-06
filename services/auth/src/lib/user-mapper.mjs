/**
 * @param {{ roles?: Array<{ role: { code: string, label: string } }> } | null | undefined} user
 */
export function mapRoles(user) {
  return (user?.roles || []).map(({ role }) => ({
    code: role.code,
    label: role.label
  }));
}

/**
 * @param {{ id: string, email: string, firstName: string, lastName: string, siteId: string | null, isActive: boolean, roles?: Array<{ role: { code: string, label: string } }> }} user
 */
export function mapUser(user) {
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

export const userInclude = {
  roles: { include: { role: true } },
  site: true
};

/**
 * @param {{ id: string, email: string, firstName: string, lastName: string, siteId: string | null, isActive: boolean, roles?: Array<{ role: { code: string, label: string } }> }} user
 */
export function buildAccessTokenPayload(user) {
  return {
    sub: user.id,
    email: user.email,
    siteId: user.siteId,
    roles: mapRoles(user).map((role) => role.code)
  };
}
