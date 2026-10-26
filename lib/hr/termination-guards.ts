import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { terminations, users } from "@/lib/db/schema";
import { roleHasPermission } from "@/lib/auth/role-change-rules";
import { blocksNewTermination, terminationDateError } from "@/lib/hr/termination-rules";

/** R3-ADM-02: backdating is a Super Admin call (the termination approver). */
export function canBackdateTermination(role: string | null | undefined): boolean {
  return roleHasPermission(role, "hr:termination:approve");
}

export async function checkTerminationDate(
  effectiveDate: string,
  role: string | null | undefined,
  userId: string,
): Promise<string | null> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { joiningDate: true } });
  return terminationDateError(effectiveDate, {
    canBackdate: canBackdateTermination(role),
    joiningDate: user?.joiningDate ?? null,
  });
}

/**
 * R3-ADM-07: the reason a new (or re-opened) termination for `userId` is
 * refused, or null. `excludeId` skips the record being edited/resubmitted.
 */
export async function terminationConflict(
  orgId: string,
  userId: string,
  excludeId?: number,
): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isActive: true },
  });
  if (user && user.isActive === false) return "This employee is already terminated or inactive.";

  const rows = await db.query.terminations.findMany({
    where: and(
      eq(terminations.orgId, orgId),
      eq(terminations.userId, userId),
      ...(excludeId ? [ne(terminations.id, excludeId)] : []),
    ),
    columns: { id: true, status: true, effectiveDate: true },
  });
  const blocking = rows.find((t) => blocksNewTermination(t));
  if (!blocking) return null;
  return blocking.status === "COMPLETED"
    ? "This employee is already terminated."
    : `This employee already has an open termination (#${blocking.id}). Edit or cancel that one instead.`;
}
