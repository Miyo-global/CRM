import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { withRoles, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsRequisitions } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import {
  logRequisitionActivity,
  resolveApprover,
  sendRequisitionApprovalEmail,
} from "@/lib/ats/requisitions";
import { logger } from "@/lib/logger";

/** MIYO-0632: send a draft to its approver. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requisitionId: string }> },
) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const requisitionId = Number((await params).requisitionId);
    if (!Number.isInteger(requisitionId)) return err("Invalid requisition ID.", 400);

    const existing = await db.query.atsRequisitions.findFirst({
      where: and(eq(atsRequisitions.id, requisitionId), eq(atsRequisitions.orgId, session.orgId)),
    });
    if (!existing) return err("Requisition not found.", 404);
    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      return err("This requisition has already been submitted.", 409);
    }

    const approverId = await resolveApprover(session.orgId, existing.approverId);
    if (!approverId) {
      return err("No approver found. Name one on the requisition first.", 422);
    }

    const [submitted] = await db
      .update(atsRequisitions)
      .set({
        status: "PENDING",
        approverId,
        decidedAt: null,
        decisionNote: null,
        updatedAt: new Date(),
      })
      .where(eq(atsRequisitions.id, requisitionId))
      .returning();

    await logRequisitionActivity({
      orgId: session.orgId,
      requisitionId,
      actorId: session.user.id,
      type: "requisition_submitted",
      data: { approverId },
    });

    // The request is submitted whether or not the mail goes out.
    let emailSent = false;
    try {
      emailSent = await sendRequisitionApprovalEmail(requisitionId);
    } catch (error) {
      logger.error("Requisition approval email failed", { requisitionId, error });
    }

    return ok({ ...submitted, emailSent });
  }, req);
}
