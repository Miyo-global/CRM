import { withAuth, withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { ensureLeaveTypes } from "@/server/actions/leave-actions/leave-balance";
import { db } from "@/lib/db";
import { leaveTypes } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { COMP_OFF_LEAVE_NAME } from "@/lib/leave-policy";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** The org's own leave types, which HR can now edit (QA-0051). */
export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const types = await ensureLeaveTypes(session.orgId);
    return ok(types);
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  daysPerYear: z.number().int().min(0).max(365),
  carryForward: z.boolean().optional(),
});

/** Adds a leave type next to the defaults (INFO-no-add-leave-type-button). */
export async function POST(req: NextRequest) {
  return withRoles(ADMIN_ROLES)(async (session) => {
    const body = await parseBody(req, createSchema);
    const lower = body.name.toLowerCase();
    // Comp-off is created and credited by the comp-off grant flow.
    if (lower === COMP_OFF_LEAVE_NAME.toLowerCase()) {
      return err(`"${COMP_OFF_LEAVE_NAME}" is managed through comp-off grants.`, 400);
    }

    const existing = await db.query.leaveTypes.findFirst({
      where: and(eq(leaveTypes.orgId, session.orgId), sql`lower(${leaveTypes.name}) = ${lower}`),
      columns: { id: true },
    });
    if (existing) return err("A leave type with this name already exists.", 409);

    const [row] = await db
      .insert(leaveTypes)
      .values({
        orgId: session.orgId,
        name: body.name,
        daysPerYear: body.daysPerYear,
        carryForward: body.carryForward ?? false,
      })
      .returning();

    await createAuditLog({
      action: "leave_policy.type_created",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(row!.id),
      targetType: "leave_type",
      metadata: { name: body.name, daysPerYear: body.daysPerYear, carryForward: body.carryForward ?? false },
    });

    return ok(row, 201);
  }, req);
}
