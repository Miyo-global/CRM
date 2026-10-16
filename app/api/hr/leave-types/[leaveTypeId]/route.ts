import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveTypes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { LEAVE_POLICY } from "@/lib/leave-policy";
import { createAuditLog } from "@/lib/audit-log";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import type { NextRequest } from "next/server";

const patchSchema = z.object({
  daysPerYear: z.number().int().min(0).max(365).optional(),
  carryForward: z.boolean().optional(),
});

/**
 * Edits one leave type's allowance.
 *
 * The policy page was read-only and driven by constants, so HR could not
 * change an allowance without a deploy (QA-0051).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leaveTypeId: string }> },
) {
  return withRoles(ADMIN_ROLES)(async (session) => {
    const { leaveTypeId: raw } = await params;
    const leaveTypeId = Number(raw);
    if (!leaveTypeId) return err("Invalid leave type.", 400);

    const body = await parseBody(req, patchSchema);
    if (body.daysPerYear === undefined && body.carryForward === undefined) {
      return err("Nothing to update.", 400);
    }

    const existing = await db.query.leaveTypes.findFirst({
      where: and(eq(leaveTypes.id, leaveTypeId), eq(leaveTypes.orgId, session.orgId)),
    });
    if (!existing) return err("Leave type not found.", 404);

    // Unpaid leave has no annual allowance to set.
    if (existing.name === LEAVE_POLICY.UNPAID.name && body.daysPerYear) {
      return err("Unpaid leave has no annual allowance.", 400);
    }

    await db
      .update(leaveTypes)
      .set({
        ...(body.daysPerYear !== undefined && { daysPerYear: body.daysPerYear }),
        ...(body.carryForward !== undefined && { carryForward: body.carryForward }),
      })
      .where(and(eq(leaveTypes.id, leaveTypeId), eq(leaveTypes.orgId, session.orgId)));

    await createAuditLog({
      action: "leave_policy.updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(leaveTypeId),
      targetType: "leave_type",
      metadata: {
        name: existing.name,
        from: { daysPerYear: existing.daysPerYear, carryForward: existing.carryForward },
        to: body,
      },
    });

    return ok({ success: true });
  }, req);
}
