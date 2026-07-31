"server-only";

import { db } from "@/lib/db";
import { departmentMembers, departments, organizationMembers, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Keep the `department_members` join table in sync with a user's
 * `users.departmentId` (D18). The directory writes `users.departmentId`
 * directly, but the department delete-guard and headcount features read
 * `department_members`. Without this sync the join table drifts and
 * departments look empty even when users point at them.
 *
 * - If `departmentId` is null/undefined, all of the user's department
 *   memberships are removed (orphan prevention).
 * - Otherwise the user is made a member of exactly that department, and any
 *   stale memberships in other departments are removed.
 *
 * Safe to call inside an existing transaction by passing `tx`.
 */
export async function syncUserDepartmentMembership(
  client: DbOrTx,
  userId: string,
  departmentId: number | null | undefined,
): Promise<void> {
  if (departmentId == null) {
    await client.delete(departmentMembers).where(eq(departmentMembers.userId, userId));
    return;
  }

  // department_members.departmentId is a NOT NULL FK to departments.id, so we
  // must only insert for a department row that actually exists. Transient
  // values like the onboarding wizard's negative "common department" ids point
  // at no real row — skip the join-table write rather than violate the FK.
  const [deptRow] = await client
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.id, departmentId))
    .limit(1);
  if (!deptRow) {
    // Department doesn't exist (yet): drop any stale memberships for this user
    // and leave the join table empty for them.
    await client.delete(departmentMembers).where(eq(departmentMembers.userId, userId));
    return;
  }

  // Remove memberships pointing at any other department.
  const current = await client
    .select({ id: departmentMembers.id, departmentId: departmentMembers.departmentId })
    .from(departmentMembers)
    .where(eq(departmentMembers.userId, userId));

  const alreadyMember = current.some((m) => m.departmentId === departmentId);

  for (const m of current) {
    if (m.departmentId !== departmentId) {
      await client.delete(departmentMembers).where(eq(departmentMembers.id, m.id));
    }
  }

  if (!alreadyMember) {
    await client
      .insert(departmentMembers)
      .values({ userId, departmentId })
      .onConflictDoNothing({
        target: [departmentMembers.departmentId, departmentMembers.userId],
      });
  }
}

/**
 * Count how many DISTINCT users reference a department, via EITHER the
 * `department_members` join table OR `users.departmentId` directly. Used by
 * the department delete-guard (D17) so deletion is blocked when the department
 * is referenced through either path. Both sides are scoped to `orgId`.
 */
export async function countDepartmentReferences(
  orgId: string,
  departmentId: number,
): Promise<number> {
  const [memberRows, directRows] = await Promise.all([
    // Users linked through the join table (scoped to the org via membership).
    db
      .select({ userId: departmentMembers.userId })
      .from(departmentMembers)
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.userId, departmentMembers.userId),
          eq(organizationMembers.orgId, orgId),
        ),
      )
      .where(eq(departmentMembers.departmentId, departmentId)),
    // Users pointing at the department directly via users.departmentId.
    db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(
        organizationMembers,
        and(
          eq(organizationMembers.userId, users.id),
          eq(organizationMembers.orgId, orgId),
        ),
      )
      .where(eq(users.departmentId, departmentId)),
  ]);

  const distinct = new Set<string>();
  for (const r of memberRows) distinct.add(r.userId);
  for (const r of directRows) distinct.add(r.userId);
  return distinct.size;
}
