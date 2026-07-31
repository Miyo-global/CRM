import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { appraisals } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { reopenAppraisalWorkflow } from "@/lib/hr/appraisal-workflow";
import { notifyNewAppraisalAssignee, scheduleAppraisalPipEmails } from "@/lib/email/hr-appraisal-pip";
import type { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only HR or CEO can reopen an appraisal.", 403);
    }
    const { id } = await params;
    const appraisalId = Number(id);
    if (!appraisalId) return err("Invalid id.", 400);

    const row = await db.query.appraisals.findFirst({
      where: and(eq(appraisals.id, appraisalId), eq(appraisals.orgId, session.orgId)),
    });
    if (!row) return err("Not found.", 404);
    if (row.currentStage !== "CLOSED") {
      return err("Only closed appraisals can be reopened.", 400);
    }

    await reopenAppraisalWorkflow(appraisalId, session.orgId, session.user.id);

    scheduleAppraisalPipEmails(() => notifyNewAppraisalAssignee(appraisalId));

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
