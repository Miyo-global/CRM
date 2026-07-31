import { db } from "@/lib/db";
import {
  appraisalCategories,
  appraisalCategoryRatings,
  appraisalCycles,
  appraisals,
  appraisalStages,
  users,
} from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import type { AppraisalStage } from "@/lib/hr/appraisal-workflow";

type AppraisalType = InferInsertModel<typeof appraisalCycles>["type"];

export async function createAppraisalBundle(input: {
  orgId: string;
  userId: string;
  reviewerId?: string | null;
  cycleId?: number | null;
  type: AppraisalType;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  anchorJoiningDate?: string | null;
  confidentialityNote?: string | null;
  initiatorId: string;
}): Promise<{ appraisalId: number; cycleId: number }> {
  const subject = await db.query.users.findFirst({
    where: eq(users.id, input.userId),
    columns: { reportingTo: true },
  });

  const resolvedReviewerId = input.reviewerId ?? subject?.reportingTo ?? null;

  return db.transaction(async (tx) => {
    let cycleId = input.cycleId ?? null;
    if (!cycleId) {
      const [c] = await tx
        .insert(appraisalCycles)
        .values({
          orgId: input.orgId,
          userId: input.userId,
          type: input.type,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          dueDate: input.dueDate ?? null,
          anchorJoiningDate: input.anchorJoiningDate ?? null,
          status: "OPEN",
        })
        .returning({ id: appraisalCycles.id });
      cycleId = c!.id;
    }

    const [appraisal] = await tx
      .insert(appraisals)
      .values({
        orgId: input.orgId,
        cycleId,
        userId: input.userId,
        reviewerId: resolvedReviewerId,
        currentStage: "SELF_REVIEW",
        confidentialityNote: input.confidentialityNote ?? null,
      })
      .returning({ id: appraisals.id });

    const appraisalId = appraisal!.id;

    const cats = await tx.select().from(appraisalCategories).orderBy(asc(appraisalCategories.sortOrder));
    if (cats.length > 0) {
      await tx.insert(appraisalCategoryRatings).values(
        cats.map((c) => ({
          appraisalId,
          categoryId: c.id,
        }))
      );
    }

    await tx.insert(appraisalStages).values({
      appraisalId,
      stage: "CYCLE_INITIATION" satisfies AppraisalStage,
      assigneeId: input.initiatorId,
      status: "COMPLETED",
      startedAt: new Date(),
      completedAt: new Date(),
      dueAt: new Date(),
    });

    await tx.insert(appraisalStages).values({
      appraisalId,
      stage: "SELF_REVIEW" satisfies AppraisalStage,
      assigneeId: input.userId,
      status: "PENDING",
      startedAt: new Date(),
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { appraisalId, cycleId };
  });
}
