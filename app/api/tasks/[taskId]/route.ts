import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tasks, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendTaskAssignedEmail } from "@/lib/email";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";


const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  notes: z.string().optional(),
  type: z.enum(["CALL", "EMAIL", "MEETING", "CUSTOM"]).optional(),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  remindAt: z.string().datetime({ offset: true }).nullable().optional(),
  timezone: z.string().optional(),
});

type RouteContext = { params: Promise<{ taskId: string }> };


export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { taskId: taskIdStr } = await ctx.params;
    const taskId = Number(taskIdStr);
    if (!Number.isFinite(taskId)) return err("Invalid task ID", 400);

    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.orgId, session.orgId)))
      .limit(1);

    if (!existing) return err("Task not found", 404);

    const canManage =
      isAdminOrOwner(session.user.role) ||
      existing.createdBy === session.user.id ||
      existing.assigneeId === session.user.id;
    if (!canManage) return err("You can only update tasks you created or are assigned to", 403);

    const body = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(tasks)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
        ...(body.dueDate !== undefined && {
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        }),
        ...(body.remindAt !== undefined && {
          remindAt: body.remindAt ? new Date(body.remindAt) : null,
        }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Failed to update task", 500);

    if (body.assigneeId && body.assigneeId !== existing.assigneeId && body.assigneeId !== session.user.id) {
      void (async () => {
        const assignee = await db.query.users.findFirst({
          where: eq(users.id, body.assigneeId!),
          columns: { email: true, name: true },
        });
        if (assignee?.email) {
          const dueStr = updated.dueDate
            ? new Date(updated.dueDate).toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "short", year: "numeric" })
            : null;
          await sendTaskAssignedEmail(
            assignee.email,
            assignee.name ?? "Team Member",
            updated.title,
            updated.type ?? "CUSTOM",
            dueStr,
            session.user.name ?? "Team Member"
          );
        }
      })().catch(() => {});
    }

    return ok(updated);
  });
}


export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { taskId: taskIdStr } = await ctx.params;
    const taskId = Number(taskIdStr);
    if (!Number.isFinite(taskId)) return err("Invalid task ID", 400);

    const [deleted] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.orgId, session.orgId)))
      .returning({ id: tasks.id });

    if (!deleted) return err("Task not found", 404);
    return ok({ success: true });
  });
}
