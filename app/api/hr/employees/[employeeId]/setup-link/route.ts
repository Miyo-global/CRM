import { withRoles, ok, err } from "@/lib/api/helpers";
import { ONBOARDING_MUTATE_ROLES } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { sendSetupLink } from "@/lib/hr/setup-link";
import { rejectDuplicateSubmit } from "@/lib/api/submit-guard";
import { createAuditLog } from "@/lib/audit-log";
import { formatIST } from "@/lib/date-utils";

/**
 * R2-LC-06: resend the welcome / set-up link to an employee who has not set a
 * password yet. A fresh single-use link replaces any earlier one.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  return withRoles(ONBOARDING_MUTATE_ROLES)(async (session) => {
    const { employeeId: targetUserId } = await params;

    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, targetUserId),
        eq(organizationMembers.orgId, session.orgId),
      ),
    });
    if (!member) return err("Employee not found.", 404);

    const user = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: {
        email: true, name: true, firstName: true, lastName: true, designation: true, employeeId: true,
        joiningDate: true, reportingTo: true, isActive: true, hasDashboardAccess: true,
        isPasswordChangeRequired: true,
      },
    });
    if (!user) return err("Employee not found.", 404);
    if (!user.isPasswordChangeRequired) {
      return err("This employee has already set a password. They can use Forgot password to reset it.", 409);
    }
    if (user.isActive === false || user.hasDashboardAccess === false) {
      return err("Turn on portal access for this employee before sending a set-up link.", 409);
    }

    const dup = await rejectDuplicateSubmit("setup-link", session.user.id, { targetUserId });
    if (dup) return dup;

    const { expiresAt } = await sendSetupLink({
      email: user.email,
      name: user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      firstName: user.firstName,
      employeeId: user.employeeId,
      designation: user.designation,
      joiningDate: user.joiningDate,
      reportingTo: user.reportingTo,
    });

    void createAuditLog({
      action: "hr.employee_updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: targetUserId,
      targetType: "employee",
      metadata: { setupLinkResent: true },
    }).catch(() => {});

    return ok({ success: true, expiresAt: expiresAt.toISOString(), expiresAtLabel: `${formatIST(expiresAt)} IST` });
  }, req);
}
