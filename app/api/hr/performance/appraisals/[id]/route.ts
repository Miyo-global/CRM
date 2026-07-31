import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { appraisals, appraisalStages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { isManagerOf } from "@/lib/rbac/manager";
import { patchAppraisalMetaSchema } from "@/lib/validations/hr-appraisals";
import type { NextRequest } from "next/server";
import type { AuthSession } from "@/lib/api/helpers";

async function canViewAppraisal(
  session: AuthSession,
  appraisal: { id: number; orgId: string; userId: string; reviewerId: string | null; currentStage: string | null }
): Promise<boolean> {
  if (appraisal.orgId !== session.orgId) return false;
  if (isAdminOrOwner(session.user.role)) return true;
  if (appraisal.userId === session.user.id) return true;
  if (appraisal.reviewerId === session.user.id) return true;
  const pending = await db.query.appraisalStages.findFirst({
    where: and(
      eq(appraisalStages.appraisalId, appraisal.id),
      eq(appraisalStages.status, "PENDING"),
      eq(appraisalStages.assigneeId, session.user.id)
    ),
  });
  if (pending) return true;
  return isManagerOf(session.user.id, appraisal.userId);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    const { id } = await params;
    const appraisalId = Number(id);
    if (!appraisalId) return err("Invalid id.", 400);

    const row = await db.query.appraisals.findFirst({
      where: and(eq(appraisals.id, appraisalId), eq(appraisals.orgId, session.orgId)),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        reviewer: { columns: { id: true, name: true, image: true } },
        cycle: true,
        stages: { orderBy: (s, { asc }) => [asc(s.id)] },
        categoryRatings: { with: { category: true } },
        acknowledgement: true,
      },
    });
    if (!row) return err("Not found.", 404);
    if (!(await canViewAppraisal(session, row))) return err("Forbidden.", 403);

    const hideManagerComments =
      row.userId === session.user.id &&
      row.currentStage &&
      !["EMPLOYEE_ACK", "CLOSED"].includes(row.currentStage);

    if (hideManagerComments && row.categoryRatings) {
      const sanitized = row.categoryRatings.map((r) => ({
        ...r,
        managerScore: null,
        managerComment: null,
      }));
      return ok({ ...row, categoryRatings: sanitized } as typeof row);
    }

    return ok(row);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    const { id } = await params;
    const appraisalId = Number(id);
    if (!appraisalId) return err("Invalid id.", 400);

    const row = await db.query.appraisals.findFirst({
      where: and(eq(appraisals.id, appraisalId), eq(appraisals.orgId, session.orgId)),
    });
    if (!row) return err("Not found.", 404);
    if (!(await canViewAppraisal(session, row))) return err("Forbidden.", 403);
    if (!isAdminOrOwner(session.user.role) && row.reviewerId !== session.user.id) {
      const mgr = await isManagerOf(session.user.id, row.userId);
      if (!mgr) return err("Only HR, CEO, or manager can update appraisal metadata.", 403);
    }

    const body = await parseBody(req, patchAppraisalMetaSchema);
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.outcomeNotes !== undefined) patch.outcomeNotes = body.outcomeNotes;
    if (body.confidentialityNote !== undefined) patch.confidentialityNote = body.confidentialityNote;
    if (body.calibratedRating !== undefined) patch.calibratedRating = body.calibratedRating !== null ? String(body.calibratedRating) : null;
    if (body.hrCalibrationNotes !== undefined) patch.hrCalibrationNotes = body.hrCalibrationNotes;
    if (body.proposedSalary !== undefined) patch.proposedSalary = body.proposedSalary !== null ? String(body.proposedSalary) : null;
    if (body.salaryIncrementPct !== undefined) patch.salaryIncrementPct = body.salaryIncrementPct !== null ? String(body.salaryIncrementPct) : null;
    if (body.promotionRecommended !== undefined) patch.promotionRecommended = body.promotionRecommended;
    if (body.proposedDesignation !== undefined) patch.proposedDesignation = body.proposedDesignation;
    if (body.appraisalLetterUrl !== undefined) patch.appraisalLetterUrl = body.appraisalLetterUrl;
    if (body.discussionScheduledAt !== undefined) patch.discussionScheduledAt = body.discussionScheduledAt ? new Date(body.discussionScheduledAt) : null;
    if (body.discussionNotes !== undefined) patch.discussionNotes = body.discussionNotes;
    await db.update(appraisals).set(patch).where(eq(appraisals.id, appraisalId));

    const updated = await db.query.appraisals.findFirst({
      where: eq(appraisals.id, appraisalId),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        reviewer: { columns: { id: true, name: true, image: true } },
        cycle: true,
        stages: { orderBy: (s, { asc }) => [asc(s.id)] },
        categoryRatings: { with: { category: true } },
        acknowledgement: true,
      },
    });
    return ok(updated);
  });
}
