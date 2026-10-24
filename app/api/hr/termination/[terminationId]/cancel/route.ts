import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { canManage } from "@/lib/auth/role-change-rules";
import { db } from "@/lib/db";
import { organizationMembers, terminations } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { CANCELLABLE_TERMINATION_STATUSES } from "@/lib/hr/termination-rules";
import type { NextRequest } from "next/server";

const cancelSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason for cancelling.").max(500, "Reason must be at most 500 characters."),
});

/**
 * R3-ADM-07: withdraw a submitted termination (pending approval, or approved
 * but not yet sent to the employee). Once the email went out it can only be
 * completed.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const existing = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!existing) return err("Termination not found.", 404);
    if (!(CANCELLABLE_TERMINATION_STATUSES as readonly string[]).includes(existing.status ?? "")) {
      return err("Only a termination that is pending approval or approved (email not sent) can be cancelled.", 400);
    }

    const member = await db.query.organizationMembers.findFirst({
      where: and(eq(organizationMembers.userId, existing.userId), eq(organizationMembers.orgId, session.orgId)),
      columns: { role: true },
    });
    if (member && !canManage({ userId: session.user.id, role: session.user.role }, { userId: existing.userId, role: member.role })) {
      return err("Only the Super Admin can cancel a termination for an Admin or HR account.", 403);
    }

    const { reason } = await parseBody(req, cancelSchema);

    const [updated] = await db
      .update(terminations)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(
        and(
          eq(terminations.id, terminationId),
          eq(terminations.orgId, session.orgId),
          inArray(terminations.status, [...CANCELLABLE_TERMINATION_STATUSES]),
        ),
      )
      .returning({ id: terminations.id });
    if (!updated) return err("This termination changed meanwhile. Reload and try again.", 409);

    void createAuditLog({
      action: "hr.termination_cancelled",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(terminationId),
      targetType: "termination",
      metadata: { employeeId: existing.userId, from: existing.status, to: "CANCELLED", reason },
    }).catch(() => undefined);

    return ok({ success: true });
  });
}
