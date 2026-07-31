import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { generateNextEmployeeId } from "@/lib/hr/generate-employee-id";

/** Assigns auto-generated employee IDs to org members that are missing one. */
export async function backfillMissingEmployeeIds(orgId: string): Promise<number> {
  const members = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: {
      user: {
        columns: { id: true, employeeId: true, joiningDate: true },
      },
    },
  });

  let updated = 0;
  for (const member of members) {
    const user = member.user;
    if (user.employeeId?.trim()) continue;

    const referenceDate = user.joiningDate ? new Date(user.joiningDate) : new Date();
    const employeeId = await generateNextEmployeeId(referenceDate);
    await db.update(users).set({ employeeId }).where(eq(users.id, user.id));
    updated += 1;
  }

  return updated;
}

export async function countMissingEmployeeIds(orgId: string): Promise<number> {
  const rows = await db
    .select({ id: users.id })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        or(isNull(users.employeeId), eq(users.employeeId, "")),
      ),
    );

  return rows.length;
}
