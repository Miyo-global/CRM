import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { performanceImprovementPlans, pipCheckIns } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const patchPIPCheckInSchema = z.object({
  managerAck: z.boolean().optional(),
  employeeAck: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pipId: string; checkInId: string }> }
) {
  return withAuth(async (session) => {
    const { pipId: pRaw, checkInId: cRaw } = await params;
    const pipId = Number(pRaw);
    const checkInId = Number(cRaw);
    if (!pipId || !checkInId) return err("Invalid id.", 400);

    const body = await parseBody(req, patchPIPCheckInSchema);

    const pip = await db.query.performanceImprovementPlans.findFirst({
      where: and(eq(performanceImprovementPlans.id, pipId), eq(performanceImprovementPlans.orgId, session.orgId)),
    });
    if (!pip) return err("PIP not found.", 404);

    const ci = await db.query.pipCheckIns.findFirst({
      where: and(eq(pipCheckIns.id, checkInId), eq(pipCheckIns.pipId, pipId)),
    });
    if (!ci) return err("Check-in not found.", 404);

    const patch: { managerAckAt?: Date; employeeAckAt?: Date; updatedAt: Date } = { updatedAt: new Date() };
    if (body.managerAck && (pip.managerId === session.user.id || pip.hrRepId === session.user.id)) {
      patch.managerAckAt = new Date();
    }
    if (body.employeeAck && pip.userId === session.user.id) {
      patch.employeeAckAt = new Date();
    }

    if (!patch.managerAckAt && !patch.employeeAckAt) {
      return err("You are not allowed to acknowledge this check-in.", 403);
    }

    await db.update(pipCheckIns).set(patch).where(eq(pipCheckIns.id, checkInId));

    const updated = await db.query.pipCheckIns.findFirst({
      where: eq(pipCheckIns.id, checkInId),
      with: { goalProgressRows: { with: { goal: true } } },
    });
    return ok(updated);
  });
}
