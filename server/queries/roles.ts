"server-only";

import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";

type RoleRow = typeof roles.$inferSelect;

const KNOWN_PERMISSIONS = new Set(PERMISSIONS.map((p) => p.name));

/** Super Admin, Admin, HR, Employee first; then everything else by name. */
const SYSTEM_ORDER = ["CEO", "ADMIN", "HR", "EMPLOYEE"];

/**
 * QA-ROLE-03: the role card counted the stored jsonb (stale names included,
 * 81 for CEO) while the matrix counted the live catalogue (69), and system
 * roles stored nothing although their defaults were granted in code (QA Role
 * 5 vs 0, Sales 14 vs 12). Every count now comes from the same effective
 * set: defaults plus stored additions, restricted to permissions that exist.
 */
export function withEffectivePermissions(row: RoleRow) {
  const stored = (row.permissions ?? []).filter((name) => KNOWN_PERMISSIONS.has(name));
  const defaults = row.isSystem
    ? (ROLE_DEFAULT_PERMISSIONS[row.slug] ?? []).filter((name) => KNOWN_PERMISSIONS.has(name))
    : [];
  const permissions = row.slug === "CEO" ? [...KNOWN_PERMISSIONS] : [...new Set([...defaults, ...stored])];
  return { ...row, permissions, defaultPermissions: row.slug === "CEO" ? permissions : defaults };
}

function systemRank(row: RoleRow): number {
  const index = SYSTEM_ORDER.indexOf(row.slug);
  return index === -1 ? SYSTEM_ORDER.length : index;
}

export async function getRoles(orgId: string) {
  const rows = await db.query.roles.findMany({
    where: eq(roles.orgId, orgId),
    orderBy: [asc(roles.name)],
  });
  return rows
    .sort((a, b) => systemRank(a) - systemRank(b))
    .map(withEffectivePermissions);
}

export async function getRole(orgId: string, id: number) {
  const row = await db.query.roles.findFirst({
    where: and(eq(roles.id, id), eq(roles.orgId, orgId)),
  });
  return row ? withEffectivePermissions(row) : row;
}
