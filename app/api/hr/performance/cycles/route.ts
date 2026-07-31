import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reviewCycles, organizations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createReviewCycleSchema } from "@/lib/validations/hr";
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

export async function GET() {
  return withAuth(async (session) => {
    const data = await db.query.reviewCycles.findMany({
      where: eq(reviewCycles.orgId, session.orgId),
      orderBy: [desc(reviewCycles.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create review cycles.", 403);
    }
    const body = await parseBody(req, createReviewCycleSchema);
    const orgStartErr = await assertCycleOrgStart(session.orgId, body.periodStart);
    if (orgStartErr) return err(orgStartErr, 400);
    const [cycle] = await db
      .insert(reviewCycles)
      .values({
        orgId: session.orgId,
        name: body.name,
        type: body.type,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        deadline: body.deadline,
        description: body.description,
        status: "DRAFT",
        createdBy: session.user.id,
      })
      .returning();
    return ok(cycle, 201);
  });
}
