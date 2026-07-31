import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceImprovementPlans } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { acknowledgePIPSchema } from "@/lib/validations/hr-pip";
import { notifyPIPManagerAfterAcknowledge, scheduleAppraisalPipEmails } from "@/lib/email/hr-appraisal-pip";
import type { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pipId: string }> }
) {
  return withAuth(async (session) => {
    const { pipId: raw } = await params;
    const pipId = Number(raw);
    if (!pipId) return err("Invalid id.", 400);

    const body = await parseBody(req, acknowledgePIPSchema);

    const row = await db.query.performanceImprovementPlans.findFirst({
      where: and(eq(performanceImprovementPlans.id, pipId), eq(performanceImprovementPlans.orgId, session.orgId)),
    });
    if (!row) return err("Not found.", 404);
    if (row.userId !== session.user.id) return err("Only the employee can acknowledge their PIP.", 403);
    if (row.acknowledgedAt) return err("This PIP has already been acknowledged.", 409);
    if (row.status !== "DRAFT") return err("This PIP is not awaiting acknowledgement.", 409);

    await db
      .update(performanceImprovementPlans)
      .set({
        acknowledgedAt: new Date(),
        acknowledgedComment: body.comment ?? null,
        status: "ACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(performanceImprovementPlans.id, pipId));

    const updated = await db.query.performanceImprovementPlans.findFirst({
      where: eq(performanceImprovementPlans.id, pipId),
      with: { user: true, manager: true, hrRep: true, goals: true },
    });

    scheduleAppraisalPipEmails(() => notifyPIPManagerAfterAcknowledge(pipId));

    return ok(updated);
  });
}
