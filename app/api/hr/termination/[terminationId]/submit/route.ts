import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { terminations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import { checkTerminationDate, terminationConflict } from "@/lib/hr/termination-guards";
import type { NextRequest } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    // R2-TERM-01: Admins start terminations, so they run the HR steps too.
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only HR or an Admin can submit for Super Admin approval.", 403);
    }

    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const existing = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!existing) return err("Termination not found.", 404);
    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      return err("Only draft or rejected terminations can be submitted.", 400);
    }

    // R3-ADM-02 / R3-ADM-07: a draft saved earlier (or a rejected one being
    // resubmitted) is checked again: the date may have passed, and a rejected
    // one may now sit beside another open termination.
    const dateError = checkTerminationDate(String(existing.effectiveDate).slice(0, 10), session.user.role);
    if (dateError) return err(`${dateError} Edit the date first.`, 400);
    if (existing.status === "REJECTED") {
      const conflict = await terminationConflict(session.orgId, existing.userId, existing.id);
      if (conflict) return err(conflict, 409);
    }

    const previousStatus = existing.status;

    await db.update(terminations).set({
      status: "PENDING_CEO",
      ceoRemarks: null,
      ceoReviewedBy: null,
      ceoReviewedAt: null,
      updatedAt: new Date(),
    }).where(eq(terminations.id, terminationId));

    void writeAuditLog({
      action: "TERMINATION_SUBMITTED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(terminationId),
      targetType: "termination",
      metadata: { from: previousStatus, to: "PENDING_CEO", employeeId: existing.userId },
    }).catch(() => undefined);

    return ok({ success: true });
  });
}
