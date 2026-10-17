import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsRequisitions } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { logRequisitionActivity } from "@/lib/ats/requisitions";
import { requisitionBodySchema } from "@/lib/validations/ats-requisition";

/** MIYO-0632: edit a requisition while it is still a draft or was rejected. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requisitionId: string }> },
) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const requisitionId = Number((await params).requisitionId);
    if (!Number.isInteger(requisitionId)) return err("Invalid requisition ID.", 400);

    try {
      const body = await parseBody(req, requisitionBodySchema);

      const existing = await db.query.atsRequisitions.findFirst({
        where: and(
          eq(atsRequisitions.id, requisitionId),
          eq(atsRequisitions.orgId, session.orgId),
        ),
      });
      if (!existing) return err("Requisition not found.", 404);
      if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
        return err("Only a draft or rejected requisition can be edited.", 409);
      }

      const [updated] = await db
        .update(atsRequisitions)
        .set({
          title: body.title,
          departmentId: body.departmentId ?? null,
          location: body.location ?? null,
          employmentType: body.employmentType,
          openings: body.openings,
          salaryMin: body.salaryMin?.toString() ?? null,
          salaryMax: body.salaryMax?.toString() ?? null,
          currency: body.currency,
          justification: body.justification ?? null,
          hiringManagerId: body.hiringManagerId ?? null,
          approverId: body.approverId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(atsRequisitions.id, requisitionId))
        .returning();

      await logRequisitionActivity({
        orgId: session.orgId,
        requisitionId,
        actorId: session.user.id,
        type: "requisition_edited",
      });

      return ok(updated);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid requisition.", 400);
      throw e;
    }
  }, req);
}

/** Withdraw a request nobody has acted on yet. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ requisitionId: string }> },
) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const requisitionId = Number((await params).requisitionId);
    if (!Number.isInteger(requisitionId)) return err("Invalid requisition ID.", 400);

    const [cancelled] = await db
      .update(atsRequisitions)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(
        and(
          eq(atsRequisitions.id, requisitionId),
          eq(atsRequisitions.orgId, session.orgId),
        ),
      )
      .returning();
    if (!cancelled) return err("Requisition not found.", 404);

    await logRequisitionActivity({
      orgId: session.orgId,
      requisitionId,
      actorId: session.user.id,
      type: "requisition_cancelled",
    });

    return ok(cancelled);
  }, req);
}
