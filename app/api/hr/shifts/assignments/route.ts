import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, shiftAssignments, shifts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { planAssignment } from "@/lib/hr/shifts";
import { createShiftAssignmentSchema } from "@/lib/validations/shifts";
import type { NextRequest } from "next/server";

/**
 * Put an employee on a shift. An earlier open-ended assignment is closed the
 * day before; any other overlap is refused (409).
 */
export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createShiftAssignmentSchema);
    const effectiveTo = body.effectiveTo ?? null;

    const [membership, shift] = await Promise.all([
      db.query.organizationMembers.findFirst({
        where: and(eq(organizationMembers.userId, body.userId), eq(organizationMembers.orgId, session.orgId)),
      }),
      db.query.shifts.findFirst({
        where: and(eq(shifts.id, body.shiftId), eq(shifts.orgId, session.orgId)),
      }),
    ]);
    if (!membership) return err("Employee not found.", 404);
    if (!shift) return err("Shift not found.", 404);
    if (!shift.isActive) return err("This shift is archived. Restore it before assigning employees.", 409);

    const created = await db.transaction(async (tx) => {
      // Row locks serialise two HR users assigning the same employee at once.
      const existing = await tx
        .select({
          id: shiftAssignments.id,
          effectiveFrom: shiftAssignments.effectiveFrom,
          effectiveTo: shiftAssignments.effectiveTo,
        })
        .from(shiftAssignments)
        .where(and(eq(shiftAssignments.orgId, session.orgId), eq(shiftAssignments.userId, body.userId)))
        .for("update");
      const plan = planAssignment(existing, body.effectiveFrom, effectiveTo);
      if (!plan.ok) return null;
      for (const c of plan.close) {
        await tx.update(shiftAssignments).set({ effectiveTo: c.effectiveTo }).where(eq(shiftAssignments.id, c.id));
      }
      const [row] = await tx
        .insert(shiftAssignments)
        .values({
          orgId: session.orgId,
          userId: body.userId,
          shiftId: body.shiftId,
          effectiveFrom: body.effectiveFrom,
          effectiveTo,
        })
        .returning();
      return row;
    });
    if (!created) {
      return err("This employee already has a shift in that period. Remove or shorten it first.", 409);
    }
    return ok(created, 201);
  });
}
