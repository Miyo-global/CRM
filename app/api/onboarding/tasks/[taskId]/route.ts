import { type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingTasks, users, organizationMembers } from "@/lib/db/schema";
import { sendOnboardingCompleteEmployeeEmail, sendOnboardingCompleteHrEmail } from "@/lib/email";

const patchSchema = z.object({
  status: z.enum(["COMPLETED", "PENDING"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return withAuth(async (session) => {
    const { taskId } = await params;
    const taskIdNum = Number(taskId);
    if (!Number.isFinite(taskIdNum)) {
      return err("Invalid task ID", 400);
    }

    const body = await parseBody(req, patchSchema);

    const [task] = await db
      .select()
      .from(onboardingTasks)
      .where(and(eq(onboardingTasks.id, taskIdNum), eq(onboardingTasks.orgId, session.orgId)));

    if (!task) {
      return err("Task not found", 404);
    }

    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN" || role === "BRANCH_MANAGER";

    if (!isAdmin && task.userId !== session.user.id) {
      return err("Forbidden", 403);
    }

    const now = new Date();
    await db
      .update(onboardingTasks)
      .set({
        status: body.status,
        completedAt: body.status === "COMPLETED" ? now : null,
        completedBy: body.status === "COMPLETED" ? session.user.id : null,
      })
      .where(eq(onboardingTasks.id, taskIdNum));

    if (body.status === "COMPLETED") {
      void (async () => {
        const pendingTasks = await db
          .select({ id: onboardingTasks.id })
          .from(onboardingTasks)
          .where(
            and(
              eq(onboardingTasks.userId, task.userId),
              eq(onboardingTasks.orgId, session.orgId),
              eq(onboardingTasks.status, "PENDING")
            )
          );

        if (pendingTasks.length > 0) return;

        const employee = await db.query.users.findFirst({
          where: eq(users.id, task.userId),
          columns: { email: true, name: true },
        });

        if (employee?.email) {
          await sendOnboardingCompleteEmployeeEmail(
            employee.email,
            employee.name ?? "Team Member"
          );
        }

        const hrUsers = await db
          .select({ email: users.email, name: users.name })
          .from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.role, "HR")));

        for (const hrUser of hrUsers) {
          if (hrUser.email) {
            await sendOnboardingCompleteHrEmail(
              hrUser.email,
              hrUser.name ?? "HR",
              employee?.name ?? "Employee"
            );
          }
        }
      })().catch(() => {});
    }

    return ok({ success: true });
  });
}
