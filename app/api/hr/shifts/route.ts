import { withAdmin, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { shiftAssignments, shifts, users } from "@/lib/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { createShiftSchema } from "@/lib/validations/shifts";
import type { NextRequest } from "next/server";

/** Shifts and every assignment in the org (HR / Admin). */
export async function GET() {
  return withAdmin(async (session) => {
    const [shiftRows, assignmentRows] = await Promise.all([
      db.select().from(shifts).where(eq(shifts.orgId, session.orgId)).orderBy(desc(shifts.isActive), asc(shifts.name)),
      db
        .select({
          id: shiftAssignments.id,
          userId: shiftAssignments.userId,
          shiftId: shiftAssignments.shiftId,
          effectiveFrom: shiftAssignments.effectiveFrom,
          effectiveTo: shiftAssignments.effectiveTo,
          employeeName: users.name,
          employeeEmail: users.email,
          employeeCode: users.employeeId,
        })
        .from(shiftAssignments)
        .innerJoin(users, eq(users.id, shiftAssignments.userId))
        .where(eq(shiftAssignments.orgId, session.orgId))
        .orderBy(desc(shiftAssignments.effectiveFrom)),
    ]);
    return ok({ shifts: shiftRows, assignments: assignmentRows });
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createShiftSchema);
    const [shift] = await db
      .insert(shifts)
      .values({ orgId: session.orgId, ...body })
      .returning();
    return ok(shift, 201);
  });
}
