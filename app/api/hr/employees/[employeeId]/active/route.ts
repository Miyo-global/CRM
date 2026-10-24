import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers, terminations, auditLogs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuditLog, requestIp } from "@/lib/audit-log";
import { invalidateUserSession, revokeAllUserSessions } from "@/lib/auth";
import { getTodayString } from "@/lib/date-utils";

const setActiveSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().max(500, "Reason must be at most 500 characters.").optional(),
});

/**
 * D7: lightweight "mark inactive / mark active" toggle, distinct from the
 * termination workflow. Termination (with CEO review, full-and-final
 * settlement and asset returns) goes through /api/hr/termination — this
 * endpoint only flips users.isActive so an employee can be temporarily
 * suspended and reactivated without the full off-boarding paperwork.
 *
 * Admin/owner only.
 *
 * R3-SA-02: re-activating someone with a completed termination is a re-hire:
 * it needs a reason, notes the re-hire on the termination record and writes an
 * "hr.employee_rehired" audit event in the same transaction (the daily
 * deactivation job reads that event, so it does not close the account again).
 * Portal Access stays off until an admin turns it on explicitly.
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

    const { isActive, reason } = await parseBody(req, setActiveSchema);

    const current = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: { isActive: true },
    });
    if (!current) return err("User not found.", 404);

    if ((current.isActive ?? true) === isActive) {
      return ok({ success: true, isActive });
    }

    const termination = isActive
      ? await db.query.terminations.findFirst({
          where: and(
            eq(terminations.orgId, session.orgId),
            eq(terminations.userId, targetUserId),
            eq(terminations.status, "COMPLETED"),
          ),
          orderBy: [desc(terminations.updatedAt)],
          columns: { id: true, internalNotes: true },
        })
      : undefined;

    if (termination) {
      if (!reason || reason.length < 3) {
        return err("This employee was terminated. Give a reason to re-hire them.", 400);
      }
      const note = `Re-hired on ${getTodayString()} by ${session.user.name ?? session.user.email ?? session.user.id}: ${reason}`;
      const ipAddress = await requestIp();
      await db.transaction(async (tx) => {
        await tx.update(users).set({ isActive: true, updatedAt: new Date() }).where(eq(users.id, targetUserId));
        await tx
          .update(terminations)
          .set({
            internalNotes: termination.internalNotes ? `${termination.internalNotes}\n${note}` : note,
            updatedAt: new Date(),
          })
          .where(eq(terminations.id, termination.id));
        await tx.insert(auditLogs).values({
          action: "hr.employee_rehired",
          userId: session.user.id,
          orgId: session.orgId,
          targetId: targetUserId,
          targetType: "employee",
          metadata: { terminationId: termination.id, reason },
          ipAddress,
        });
      });
      await invalidateUserSession(targetUserId);
      return ok({ success: true, isActive, rehired: true });
    }

    await db.update(users).set({ isActive }).where(eq(users.id, targetUserId));
    // A suspended account must not keep working off an unexpired JWT.
    if (!isActive) await revokeAllUserSessions(targetUserId);
    else await invalidateUserSession(targetUserId);

    void createAuditLog({
      action: "hr.employee_updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: targetUserId,
      targetType: "employee",
      metadata: { activeStatusChange: true, isActive, ...(reason ? { reason } : {}) },
    }).catch(() => {});

    return ok({ success: true, isActive });
  });
}
