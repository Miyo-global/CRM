import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceReviews, organizationMembers, users, reviewCycles } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createPerformanceReviewSchema } from "@/lib/validations/hr";
import type { NextRequest } from "next/server";
import { sendReviewAssignedEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = req.nextUrl.searchParams.get("userId") ?? undefined;
    const cycleId = req.nextUrl.searchParams.get("cycleId");

    if (filterUserId && filterUserId !== session.user.id && !isAdmin) {
      return err("Not authorized.", 403);
    }

    const conditions = [eq(performanceReviews.orgId, session.orgId)];
    if (filterUserId) conditions.push(eq(performanceReviews.userId, filterUserId));
    else if (!isAdmin) conditions.push(eq(performanceReviews.userId, session.user.id));
    if (cycleId) conditions.push(eq(performanceReviews.cycleId, Number(cycleId)));

    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 100);
    const offset = Math.max(Number(req.nextUrl.searchParams.get("offset") ?? 0), 0);

    const data = await db.query.performanceReviews.findMany({
      where: and(...conditions),
      with: {
        user: { columns: { id: true, name: true, image: true, email: true } },
        reviewer: { columns: { id: true, name: true, image: true, email: true } },
        cycle: true,
      },
      orderBy: [desc(performanceReviews.createdAt)],
      limit,
      offset,
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create reviews.", 403);
    }

    const body = await parseBody(req, createPerformanceReviewSchema);

    const targetMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
    });
    if (!targetMember) return err("Employee not found in your organization.", 404);

    const employee = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
      columns: { joiningDate: true },
    });
    if (employee?.joiningDate) {
      const joining = String(employee.joiningDate).slice(0, 10);
      if (body.periodStart < joining) {
        return err("Review start date cannot be before the employee's joining date.", 400);
      }
    }

    if (body.reviewerId) {
      const reviewerMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, body.reviewerId),
          eq(organizationMembers.orgId, session.orgId)
        ),
      });
      if (!reviewerMember) return err("Reviewer not found in your organization.", 404);
    }

    if (body.cycleId) {
      const cycle = await db.query.reviewCycles.findFirst({
        where: and(eq(reviewCycles.id, body.cycleId), eq(reviewCycles.orgId, session.orgId)),
      });
      if (!cycle) return err("Review cycle not found in your organization.", 404);
      if (cycle.periodStart && body.periodStart < cycle.periodStart) {
        return err("Review start date must fall within the selected cycle's period.", 400);
      }
      if (cycle.periodEnd && body.periodEnd > cycle.periodEnd) {
        return err("Review end date must fall within the selected cycle's period.", 400);
      }
    }

    const [review] = await db
      .insert(performanceReviews)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        reviewerId: body.reviewerId ?? session.user.id,
        cycleId: body.cycleId,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        ratings: body.ratings,
        strengths: body.strengths,
        improvements: body.improvements,
        overallRating: body.overallRating?.toString(),
        comments: body.comments,
        status: "DRAFT",
      })
      .returning();

    void (async () => {
      const [employee, reviewer] = await Promise.all([
        db.query.users.findFirst({
          where: eq(users.id, body.userId),
          columns: { email: true, name: true },
        }),
        db.query.users.findFirst({
          where: eq(users.id, body.reviewerId ?? session.user.id),
          columns: { name: true },
        }),
      ]);
      if (employee?.email) {
        await sendReviewAssignedEmail(
          employee.email,
          employee.name ?? "Employee",
          reviewer?.name ?? session.user.name ?? "Manager",
          body.periodStart,
          body.periodEnd
        );
      }
    })().catch((e) => logger.error("review assigned email failed", { error: e }));

    return ok(review, 201);
  });
}
