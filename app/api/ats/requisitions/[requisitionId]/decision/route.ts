import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsRequisitions } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { checkPermission } from "@/lib/rbac/middleware";
import { logRequisitionActivity } from "@/lib/ats/requisitions";
import { requisitionDecisionSchema } from "@/lib/validations/ats-requisition";

/**
 * MIYO-0632: approve or reject, with a comment either way. Only the named
 * approver or somebody holding ats:requisitions:approve may decide.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requisitionId: string }> },
) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const requisitionId = Number((await params).requisitionId);
    if (!Number.isInteger(requisitionId)) return err("Invalid requisition ID.", 400);

    try {
      const body = await parseBody(req, requisitionDecisionSchema);

      const existing = await db.query.atsRequisitions.findFirst({
        where: and(
          eq(atsRequisitions.id, requisitionId),
          eq(atsRequisitions.orgId, session.orgId),
        ),
      });
      if (!existing) return err("Requisition not found.", 404);
      if (existing.status !== "PENDING") {
        return err("Only a submitted requisition can be decided.", 409);
      }

      const isApprover = existing.approverId === session.user.id;
      const mayApprove = await checkPermission(
        db,
        session.user.id,
        session.orgId,
        session.user.role,
        "ats:requisitions:approve",
      );
      if (!isApprover && !mayApprove) return err("Forbidden", 403);

      const [decided] = await db
        .update(atsRequisitions)
        .set({
          status: body.decision,
          decidedAt: new Date(),
          decisionNote: body.comment ?? null,
          approverId: existing.approverId ?? session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(atsRequisitions.id, requisitionId))
        .returning();

      await logRequisitionActivity({
        orgId: session.orgId,
        requisitionId,
        actorId: session.user.id,
        type: body.decision === "APPROVED" ? "requisition_approved" : "requisition_rejected",
        data: body.comment ? { comment: body.comment } : undefined,
      });

      return ok(decided);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid decision.", 400);
      throw e;
    }
  }, req);
}
