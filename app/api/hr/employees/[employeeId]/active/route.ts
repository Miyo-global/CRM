import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";

const setActiveSchema = z.object({
  isActive: z.boolean(),
});

/**
 * D7: lightweight "mark inactive / mark active" toggle, distinct from the
 * termination workflow. Termination (with CEO review, full-and-final
 * settlement and asset returns) goes through /api/hr/termination — this
 * endpoint only flips users.isActive so an employee can be temporarily
 * suspended and reactivated without the full off-boarding paperwork.
 *
 * Admin/owner only.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  return withAuth(async (session) => {
    const { employeeId: targetUserId } = await params;

    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admins and Owners can change active status.", 403);
    }

    if (session.user.id === targetUserId) {
      return err("You cannot change your own active status.", 400);
    }

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, targetUserId),
        eq(organizationMembers.orgId, session.orgId),
      ),
    });
    if (!targetMember) {
      return err("User not found in your organization.", 404);
    }

    const { isActive } = await parseBody(req, setActiveSchema);

    const current = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: { isActive: true },
    });
    if (!current) return err("User not found.", 404);

    if ((current.isActive ?? true) === isActive) {
      return ok({ success: true, isActive });
    }

    await db.update(users).set({ isActive }).where(eq(users.id, targetUserId));

    void createAuditLog({
      action: "hr.employee_updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: targetUserId,
      targetType: "employee",
      metadata: { activeStatusChange: true, isActive },
    }).catch(() => {});

    return ok({ success: true, isActive });
  });
}
