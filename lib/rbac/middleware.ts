import { rolePermissions, userPermissions, roles } from "../db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import type { db as database } from "../db";

type DbClient = Pick<typeof database, "query">;

export function requirePermission(permissionName: string) {
  return async (opts: {
    ctx: { db: DbClient; session: { userId: string; orgId: string; role?: string } };
    next: () => Promise<unknown>;
  }) => {
    const { ctx, next } = opts;
    const { userId, orgId, role } = ctx.session;

    const hasPermission = await checkPermission(
      ctx.db,
      userId,
      orgId,
      role,
      permissionName
    );

    if (!hasPermission) {
      throw Object.assign(new Error(`Permission denied: ${permissionName}`), { code: "FORBIDDEN" });
    }

    return next();
  };
}

export async function checkPermission(
  db: DbClient,
  userId: string,
  orgId: string,
  role?: string,
  permissionName?: string
): Promise<boolean> {
  if (!permissionName) return false;

  if (role === "CEO") {
    return true;
  }

  const userPerms = await db.query.userPermissions.findMany({
    where: and(
      eq(userPermissions.userId, userId),
      eq(userPermissions.orgId, orgId)
    ),
    with: {
      permission: true,
    },
  });

  const matchingUserPerm = userPerms.find(
    (up) => up.permission?.name === permissionName
  );

  if (matchingUserPerm) {
    return matchingUserPerm.granted;
  }

  if (role) {
    const rolePerms = await db.query.rolePermissions.findMany({
      where: and(
        eq(rolePermissions.role, role),
        or(eq(rolePermissions.orgId, orgId), isNull(rolePermissions.orgId))
      ),
      with: {
        permission: true,
      },
    });

    const hasRolePerm = rolePerms.some(
      (rp) => rp.permission?.name === permissionName
    );

    if (hasRolePerm) {
      return true;
    }
  }

  if (role) {
    const dbRole = await db.query.roles.findFirst({
      where: and(eq(roles.slug, role), eq(roles.orgId, orgId)),
    });

    if (dbRole?.permissions && Array.isArray(dbRole.permissions)) {
      if ((dbRole.permissions as string[]).includes(permissionName)) {
        return true;
      }
    }
  }

  const { ROLE_DEFAULT_PERMISSIONS } = await import("./permissions");
  const defaults = role ? ROLE_DEFAULT_PERMISSIONS[role] ?? [] : [];
  if (defaults.includes(permissionName)) {
    return true;
  }

  return false;
}

export function hasAnyPermission(permissionNames: string[]) {
  return async (opts: {
    ctx: { db: DbClient; session: { userId: string; orgId: string; role?: string } };
    next: () => Promise<unknown>;
  }) => {
    const { ctx, next } = opts;
    const { userId, orgId, role } = ctx.session;

    const checks = await Promise.all(
      permissionNames.map((perm) =>
        checkPermission(ctx.db, userId, orgId, role, perm)
      )
    );

    if (!checks.some((has) => has)) {
      throw Object.assign(new Error(`Permission denied: requires one of ${permissionNames.join(", ")}`), { code: "FORBIDDEN" });
    }

    return next();
  };
}
