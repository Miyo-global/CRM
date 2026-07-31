import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { targets, targetHistory, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { isBranchScoped, getBranchUserIds } from "@/lib/db/branch-filter";
import { z } from "zod";

const updateSchema = z.object({
  targetValue: z.string().optional(),
  currentValue: z.string().optional(),
  notes: z.string().optional(),
});

async function assertCanManage(
  callerRole: string,
  callerId: string,
  userIds: string[]
) {
  if (ADMIN_ROLES.includes(callerRole)) return true;
  const targetUsers = await db
    .select({ id: users.id, reportingTo: users.reportingTo })
    .from(users)
    .where(inArray(users.id, userIds));
  return targetUsers.every((u) => u.reportingTo === callerId);
}

type Ctx = { params: Promise<{ targetId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { targetId: id } = await ctx.params;
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return err("Invalid target id", 400);

  return withAuth(async (session) => {
    const input = await parseBody(req, updateSchema);
    const orgId = session.orgId!;
    const branchCtx = { role: session.user.role ?? "", branchId: session.branchId, userId: session.user.id };

    const existing = await db.query.targets.findFirst({
      where: and(eq(targets.id, targetId), eq(targets.orgId, orgId)),
    });
    if (!existing) return err("Target not found", 404);

    if (isBranchScoped(branchCtx)) {
      const branchUserIds = await getBranchUserIds(branchCtx);
      if (branchUserIds !== null && !branchUserIds.includes(existing.userId)) {
        return err("Target not in your branch", 403);
      }
    }

    const canManage = await assertCanManage(
      session.user.role ?? "",
      session.user.id,
      [existing.userId]
    );
    if (!canManage) return err("You can only set targets for your direct reports", 403);

    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
    if (input.targetValue !== undefined && input.targetValue !== existing.targetValue) {
      changes.push({ field: "targetValue", oldValue: existing.targetValue, newValue: input.targetValue });
    }
    if (input.currentValue !== undefined && input.currentValue !== (existing.currentValue ?? "0")) {
      changes.push({ field: "currentValue", oldValue: existing.currentValue ?? "0", newValue: input.currentValue });
    }
    if (input.notes !== undefined && input.notes !== existing.notes) {
      changes.push({ field: "notes", oldValue: existing.notes, newValue: input.notes });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.targetValue !== undefined) updateData.targetValue = input.targetValue;
    if (input.currentValue !== undefined) updateData.currentValue = input.currentValue;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const updated = await db.transaction(async (tx) => {
      if (changes.length > 0) {
        await tx.insert(targetHistory).values(
          changes.map((c) => ({
            targetId,
            orgId,
            changedById: session.user.id,
            field: c.field,
            oldValue: c.oldValue,
            newValue: c.newValue,
          }))
        );
      }

      const [row] = await tx.update(targets)
        .set(updateData)
        .where(and(eq(targets.id, targetId), eq(targets.orgId, orgId)))
        .returning();
      return row;
    });

    if (!updated) return err("Target not found", 404);

    await createAuditLog({
      action: "target.updated",
      userId: session.user.id,
      orgId,
      targetId: String(targetId),
      targetType: "target",
      metadata: { changes },
    });

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { targetId: id } = await ctx.params;
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return err("Invalid target id", 400);

  return withAuth(async (session) => {
    const orgId = session.orgId!;
    const branchCtx = { role: session.user.role ?? "", branchId: session.branchId, userId: session.user.id };

    const existing = await db.query.targets.findFirst({
      where: and(eq(targets.id, targetId), eq(targets.orgId, orgId)),
    });
    if (!existing) return err("Target not found", 404);

    if (isBranchScoped(branchCtx)) {
      const branchUserIds = await getBranchUserIds(branchCtx);
      if (branchUserIds !== null && !branchUserIds.includes(existing.userId)) {
        return err("Target not in your branch", 403);
      }
    }

    const canManage = await assertCanManage(
      session.user.role ?? "",
      session.user.id,
      [existing.userId]
    );
    if (!canManage) return err("You can only manage targets for your direct reports", 403);

    await db.delete(targets)
      .where(and(eq(targets.id, targetId), eq(targets.orgId, orgId)));

    await createAuditLog({
      action: "target.deleted",
      userId: session.user.id,
      orgId,
      targetId: String(targetId),
      targetType: "target",
      metadata: { assignedTo: existing.userId, metricType: existing.metricType },
    });

    return ok({ success: true });
  });
}
