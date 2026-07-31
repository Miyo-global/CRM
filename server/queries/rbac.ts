"server-only";

import { db } from "@/lib/db";
import {
  userPermissions,
  rolePermissions,
  users,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/lib/rbac/permissions";

export async function getUserPermissions(userId: string, orgId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  const role = user?.role;

  const userPerms = await db.query.userPermissions.findMany({
    where: and(
      eq(userPermissions.userId, userId),
      eq(userPermissions.orgId, orgId),
      eq(userPermissions.granted, true)
    ),
    with: {
      permission: true,
    },
  });

  const rolePerms = role
    ? await db.query.rolePermissions.findMany({
        where: and(
          eq(rolePermissions.role, role),
          eq(rolePermissions.orgId, orgId)
        ),
        with: {
          permission: true,
        },
      })
    : [];

  const defaultPerms = role ? ROLE_DEFAULT_PERMISSIONS[role] ?? [] : [];

  const permissionSet = new Set<string>();

  userPerms.forEach((up) => {
    if (up.permission?.name) {
      permissionSet.add(up.permission.name);
    }
  });

  rolePerms.forEach((rp) => {
    if (rp.permission?.name) {
      permissionSet.add(rp.permission.name);
    }
  });

  defaultPerms.forEach((perm) => permissionSet.add(perm));

  if (role === "CEO") {
    PERMISSIONS.forEach((p) => permissionSet.add(p.name));
  }

  return Array.from(permissionSet);
}

export function getAllPermissions() {
  return PERMISSIONS;
}

export async function getRolePermissions(role: string, orgId: string) {
  const perms = await db.query.rolePermissions.findMany({
    where: and(
      eq(rolePermissions.role, role),
      eq(rolePermissions.orgId, orgId)
    ),
    with: {
      permission: true,
    },
  });

  return perms
    .map((rp) => rp.permission?.name)
    .filter((name): name is string => !!name);
}
