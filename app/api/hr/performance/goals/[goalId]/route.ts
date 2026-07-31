import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateGoalBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().max(1000).optional(),
  targetValue: z.number().positive().optional(),
  currentValue: z.number().min(0).optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  progress: z.number().min(0).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  return withAuth(async (session) => {
    const { goalId: id } = await params;
    const goalId = Number(id);
    if (!goalId) return err("Invalid goal ID.", 400);

    const existing = await db.query.goals.findFirst({
      where: and(eq(goals.id, goalId), eq(goals.orgId, session.orgId)),
    });
    if (!existing) return err("Goal not found.", 404);

    if (!isAdminOrOwner(session.user.role) && existing.userId !== session.user.id) {
      return err("Not authorized to update this goal.", 403);
    }

    const body = updateGoalBodySchema.parse(await req.json());

    await db.update(goals).set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.targetValue !== undefined && { targetValue: body.targetValue.toString() }),
      ...(body.currentValue !== undefined && { currentValue: body.currentValue.toString() }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.progress !== undefined && { progress: body.progress }),
      updatedAt: new Date(),
    }).where(eq(goals.id, goalId));

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  return withAuth(async (session) => {
    const { goalId: id } = await params;
    const goalId = Number(id);
    if (!goalId) return err("Invalid goal ID.", 400);

    const existing = await db.query.goals.findFirst({
      where: and(eq(goals.id, goalId), eq(goals.orgId, session.orgId)),
    });
    if (!existing) return err("Goal not found.", 404);

    if (!isAdminOrOwner(session.user.role) && existing.userId !== session.user.id) {
      return err("Not authorized to delete this goal.", 403);
    }

    await db.delete(goals).where(
      and(eq(goals.id, goalId), eq(goals.orgId, session.orgId))
    );
    return ok({ success: true });
  });
}
