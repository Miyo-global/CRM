import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceImprovementPlans, pipGoals, pipCheckIns, pipCheckInGoalProgress } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { isManagerOf } from "@/lib/rbac/manager";
import { createPIPCheckInSchema } from "@/lib/validations/hr-pip";
import type { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pipId: string }> }
) {
  return withAuth(async (session) => {
    const { pipId: raw } = await params;
    const pipId = Number(raw);
    if (!pipId) return err("Invalid id.", 400);

    const pip = await db.query.performanceImprovementPlans.findFirst({
      where: and(eq(performanceImprovementPlans.id, pipId), eq(performanceImprovementPlans.orgId, session.orgId)),
    });
    if (!pip) return err("Not found.", 404);

    const admin = isAdminOrOwner(session.user.role) || session.user.role === "ADMIN";
    const canWrite =
      admin ||
      pip.managerId === session.user.id ||
      pip.hrRepId === session.user.id ||
      (await isManagerOf(session.user.id, pip.userId));
    if (!canWrite) return err("Only manager or HR can record check-ins.", 403);

    const body = await parseBody(req, createPIPCheckInSchema);

    const goals = await db.query.pipGoals.findMany({
      where: eq(pipGoals.pipId, pipId),
      columns: { id: true },
    });
    const validGoalIds = new Set(goals.map((g) => g.id));
    if (body.goalProgress.some((g) => !validGoalIds.has(g.pipGoalId))) {
      return err("One or more goals do not belong to this PIP.", 400);
    }

    const checkInId = await db.transaction(async (tx) => {
      const [ci] = await tx
        .insert(pipCheckIns)
        .values({
          pipId,
          checkInDate: body.checkInDate,
          checkInType: body.checkInType,
          periodStart: body.periodStart ?? null,
          periodEnd: body.periodEnd ?? null,
          overallStatus: body.overallStatus,
          summaryCommentsManager: body.summaryCommentsManager,
          summaryCommentsEmployee: body.summaryCommentsEmployee ?? null,
          managerRating: body.managerRating ?? null,
          managerFeedback: body.managerFeedback,
          improvementSinceLast: body.improvementSinceLast,
          employeeSelfComments: body.employeeSelfComments,
          supportRequired: body.supportRequired ?? null,
          riskLevel: body.riskLevel,
          escalationRequired: body.escalationRequired ?? false,
          escalationNotes: body.escalationNotes ?? null,
        })
        .returning({ id: pipCheckIns.id });

      const id = ci!.id;
      for (const g of body.goalProgress) {
        await tx.insert(pipCheckInGoalProgress).values({
          checkInId: id,
          pipGoalId: g.pipGoalId,
          progressStatus: g.progressStatus,
          percentComplete: g.percentComplete,
          workDone: g.workDone,
          blockers: g.blockers,
          nextSteps: g.nextSteps,
        });
      }
      return id;
    });

    const row = await db.query.pipCheckIns.findFirst({
      where: eq(pipCheckIns.id, checkInId),
      with: { goalProgressRows: { with: { goal: true } } },
    });
    return ok(row, 201);
  });
}
