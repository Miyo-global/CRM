import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ONBOARDED_NOTIFY_ROLES, hireJoinedNotification } from "@/lib/hr/onboarded-notification";

/** Bell + email to the Super Admin, Admins and HR once a new hire has set their password. */
export async function notifyHireJoined(userId: string): Promise<void> {
  const [hire] = await db
    .select({
      orgId: organizationMembers.orgId,
      firstName: users.firstName,
      lastName: users.lastName,
      designation: users.designation,
      employeeId: users.employeeId,
      joiningDate: users.joiningDate,
    })
    .from(users)
    .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!hire) return;

  await notifyByRoles(hire.orgId, ONBOARDED_NOTIFY_ROLES, {
    type: "SUCCESS",
    ...hireJoinedNotification({ ...hire, firstName: hire.firstName ?? "", lastName: hire.lastName ?? "" }),
    link: `/hr/employees/${userId}`,
    metadata: { employeeId: userId },
    excludeUserId: userId,
  });
}
