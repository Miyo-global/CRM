import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reviewCycles, performanceReviews, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateReviewCycleSchema } from "@/lib/validations/hr";
import type { NextRequest } from "next/server";

async function assertCycleOrgStart(orgId: string, periodStart: string): Promise<string | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { createdAt: true },
  });
  if (!org?.createdAt) return null;
  const orgStart = org.createdAt.toISOString().slice(0, 10);
  if (periodStart < orgStart) {
    return "Start date cannot be before the organization's start date.";
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  return withAuth(async (session) => {
    const { cycleId: id } = await params;
    const cycleId = Number(id);
    if (!cycleId) return err("Invalid cycle ID.", 400);

    const cycle = await db.query.reviewCycles.findFirst({
      where: and(eq(reviewCycles.id, cycleId), eq(reviewCycles.orgId, session.orgId)),
      with: isAdminOrOwner(session.user.role)
        ? { reviews: true }
        : {
            reviews: {
              where: (reviews, { or, eq: eqOp }) =>
                or(eqOp(reviews.userId, session.user.id), eqOp(reviews.reviewerId, session.user.id)),
            },
          },
    });
    if (!cycle) return err("Review cycle not found.", 404);
    return ok(cycle);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden.", 403);
    const { cycleId: id } = await params;
    const cycleId = Number(id);
    if (!cycleId) return err("Invalid cycle ID.", 400);

    const existing = await db.query.reviewCycles.findFirst({
      where: and(eq(reviewCycles.id, cycleId), eq(reviewCycles.orgId, session.orgId)),
    });
    if (!existing) return err("Review cycle not found.", 404);

    const body = await parseBody(req, updateReviewCycleSchema);
    const nextStart = body.periodStart ?? existing.periodStart;
    const orgStartErr = await assertCycleOrgStart(session.orgId, nextStart);
    if (orgStartErr) return err(orgStartErr, 400);
    await db.update(reviewCycles).set({ ...body, updatedAt: new Date() }).where(eq(reviewCycles.id, cycleId));
    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden.", 403);
    const { cycleId: id } = await params;
    const cycleId = Number(id);
    if (!cycleId) return err("Invalid cycle ID.", 400);

    await db.transaction(async (tx) => {
      await tx
        .update(performanceReviews)
        .set({ cycleId: null, updatedAt: new Date() })
        .where(and(eq(performanceReviews.cycleId, cycleId), eq(performanceReviews.orgId, session.orgId)));
      await tx
        .delete(reviewCycles)
        .where(and(eq(reviewCycles.id, cycleId), eq(reviewCycles.orgId, session.orgId)));
    });
    return ok({ success: true });
  });
}
