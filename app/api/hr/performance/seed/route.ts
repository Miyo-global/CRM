import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  appraisalCategories,
  performanceImprovementPlans,
  pipGoals,
  organizationMembers,
} from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createAppraisalBundle } from "@/lib/hr/create-appraisal";

const DEFAULT_CATEGORIES = [
  { slug: "communication", name: "Communication", ratingType: "BOTH" as const, weight: "0.2000", sortOrder: 1 },
  { slug: "delivery", name: "Delivery & Execution", ratingType: "BOTH" as const, weight: "0.2000", sortOrder: 2 },
  { slug: "technical_skills", name: "Technical Skills", ratingType: "BOTH" as const, weight: "0.2000", sortOrder: 3 },
  { slug: "teamwork", name: "Teamwork & Collaboration", ratingType: "BOTH" as const, weight: "0.2000", sortOrder: 4 },
  { slug: "initiative", name: "Initiative & Ownership", ratingType: "BOTH" as const, weight: "0.2000", sortOrder: 5 },
];

export async function POST() {
  return withAuth(async (session) => {
    if (process.env.NODE_ENV === "production") {
      return err("Seeding test data is disabled in production.", 403);
    }
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only HR or CEO can seed test data.", 403);
    }

    const seeded: string[] = [];

    const [{ total }] = await db.select({ total: count() }).from(appraisalCategories);
    if ((total ?? 0) === 0) {
      await db.insert(appraisalCategories).values(DEFAULT_CATEGORIES);
      seeded.push(`${DEFAULT_CATEGORIES.length} appraisal categories`);
    } else {
      seeded.push(`categories already exist (${total}), skipped`);
    }

    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, session.orgId),
      with: { user: { columns: { id: true, name: true, email: true } } },
      limit: 3,
    });

    if (members.length >= 1) {
      const employee = members[0]!;
      const today = new Date();
      const periodStart = `${today.getFullYear()}-01-01`;
      const periodEnd = `${today.getFullYear()}-12-31`;

      try {
        const { appraisalId } = await createAppraisalBundle({
          orgId: session.orgId,
          userId: employee.userId,
          reviewerId: members[1]?.userId ?? null,
          type: "ANNUAL",
          periodStart,
          periodEnd,
          initiatorId: session.user.id,
        });
        seeded.push(`test appraisal #${appraisalId} for ${employee.user?.name ?? employee.userId}`);
      } catch (e) {
        seeded.push(`appraisal seed skipped: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (members.length >= 2) {
      const employee = members[1]!;
      const today = new Date();
      const start = today.toISOString().split("T")[0]!;
      const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;
      const goalDeadline = end;

      const [pip] = await db
        .insert(performanceImprovementPlans)
        .values({
          orgId: session.orgId,
          userId: employee.userId,
          managerId: session.user.id,
          hrRepId: session.user.id,
          reasonCategory: "POOR_PERFORMANCE",
          description: "Seed test PIP — consistently missing delivery targets over the past quarter.",
          evidence: "3 missed sprint deadlines, 2 client escalations documented in Jira.",
          areasOfConcern: ["Delivery", "Communication"],
          objectives: [{ objective: "Complete all assigned tasks on time", metric: "Zero missed deadlines for 30 days", deadline: goalDeadline }],
          startDate: start,
          endDate: end,
          reviewFrequency: "WEEKLY",
          reviewMethod: "1:1 Meeting",
          expectedImprovement: "Meet all sprint commitments consistently",
          consequencesIfNotMet: "Performance review escalation",
          status: "DRAFT",
          initiatedBy: session.user.id,
          reason: "Missed delivery targets",
        })
        .returning({ id: performanceImprovementPlans.id });

      if (pip) {
        await db.insert(pipGoals).values({
          pipId: pip.id,
          title: "Complete all assigned tasks on time",
          successCriteria: "Zero missed deadlines for 30 consecutive days",
          deadline: goalDeadline,
          sortOrder: 0,
        });
        seeded.push(`test PIP #${pip.id} for ${employee.user?.name ?? employee.userId}`);
      }
    }

    return ok({ seeded });
  });
}
