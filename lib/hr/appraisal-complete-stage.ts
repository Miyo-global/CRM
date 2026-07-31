import { db } from "@/lib/db";
import {
  appraisalAcknowledgements,
  appraisals,
  appraisalStages,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  assertManagerRatingsComplete,
  assertSelfRatingsComplete,
  nextStage,
  refreshOverallRating,
  resolveStageAssignee,
  type AppraisalStage,
} from "@/lib/hr/appraisal-workflow";

export type CompleteStageResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertPendingStageTx(
  tx: Transaction,
  appraisalId: number,
  stage: AppraisalStage,
  assigneeId: string | null
) {
  await tx.insert(appraisalStages).values({
    appraisalId,
    stage,
    assigneeId,
    status: "PENDING",
    startedAt: new Date(),
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}

export async function completeAppraisalStage(params: {
  appraisalId: number;
  orgId: string;
  actorId: string;
  comment?: string;
}): Promise<CompleteStageResult> {
  const { appraisalId, orgId, actorId, comment } = params;

  const appraisal = await db.query.appraisals.findFirst({
    where: and(eq(appraisals.id, appraisalId), eq(appraisals.orgId, orgId)),
  });
  if (!appraisal) return { ok: false, error: "Appraisal not found.", status: 404 };
  if (appraisal.currentStage === "CLOSED") {
    return { ok: false, error: "Appraisal is already closed.", status: 400 };
  }

  const stage = appraisal.currentStage as AppraisalStage;

  const pending = await db.query.appraisalStages.findFirst({
    where: and(
      eq(appraisalStages.appraisalId, appraisalId),
      eq(appraisalStages.stage, stage),
      eq(appraisalStages.status, "PENDING")
    ),
  });
  if (!pending) {
    return { ok: false, error: "No pending stage for this appraisal.", status: 400 };
  }
  if (pending.assigneeId !== actorId) {
    return { ok: false, error: "You are not the assignee for this stage.", status: 403 };
  }

  if (stage === "SELF_REVIEW") {
    const errMsg = await assertSelfRatingsComplete(appraisalId);
    if (errMsg) return { ok: false, error: errMsg, status: 400 };
  }
  if (stage === "MANAGER_REVIEW") {
    const errMsg = await assertManagerRatingsComplete(appraisalId);
    if (errMsg) return { ok: false, error: errMsg, status: 400 };
    await refreshOverallRating(appraisalId);
  }

  const next = nextStage(stage);
  if (!next) {
    return { ok: false, error: "Invalid stage transition.", status: 400 };
  }

  let nextAssignee: string | null = null;
  if (next !== "CLOSED") {
    nextAssignee = await resolveStageAssignee(orgId, next, appraisal, null);
    if (!nextAssignee) {
      return {
        ok: false,
        error: `No assignee resolved for stage ${next}. Ensure CEO/HR roles exist or reporting manager is set.`,
        status: 400,
      };
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(appraisalStages)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        comment: comment ?? null,
      })
      .where(eq(appraisalStages.id, pending.id));

    await tx
      .update(appraisals)
      .set({ currentStage: next, updatedAt: new Date() })
      .where(eq(appraisals.id, appraisalId));

    if (next === "CLOSED") {
      await tx.insert(appraisalAcknowledgements).values({
        appraisalId,
        userId: appraisal.userId,
        acknowledgedAt: new Date(),
      });
      return;
    }

    await insertPendingStageTx(tx, appraisalId, next, nextAssignee);
  });

  return { ok: true };
}
