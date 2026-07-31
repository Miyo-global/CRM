"server-only";

import { SQL, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { AnyColumn } from "drizzle-orm";
import { ROLES, ADMIN_ROLES } from "@/lib/constants/roles";

const BRANCH_SCOPED_ROLES = new Set<string>([ROLES.BRANCH_MANAGER, ROLES.BRANCH_HR]);

const ORG_WIDE_ROLES = new Set<string>(ADMIN_ROLES);

export interface BranchContext {
  role: string;
  branchId: number | null;
  userId: string;
}

export function isBranchScoped(ctx: BranchContext): boolean {
  return BRANCH_SCOPED_ROLES.has(ctx.role) && ctx.branchId !== null;
}

export function isOrgWide(ctx: BranchContext): boolean {
  return ORG_WIDE_ROLES.has(ctx.role);
}

export function branchIdFilter(
  branchIdCol: AnyColumn,
  ctx: BranchContext
): SQL | undefined {
  if (!isBranchScoped(ctx) || ctx.branchId === null) return undefined;
  return eq(branchIdCol, ctx.branchId) as SQL;
}

export async function getBranchUserIds(
  ctx: BranchContext
): Promise<string[] | null> {
  if (!isBranchScoped(ctx) || ctx.branchId === null) return null;
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.branchId, ctx.branchId));
  return rows.map((r) => r.id);
}

export async function pushBranchAssigneeFilter(
  where: SQL[],
  assigneeIdCol: AnyColumn,
  ctx: BranchContext
): Promise<void> {
  const userIds = await getBranchUserIds(ctx);
  if (userIds === null) return;

  if (userIds.length === 0) {
    where.push(sql`false`);
    return;
  }
  where.push(inArray(assigneeIdCol, userIds) as SQL);
}
