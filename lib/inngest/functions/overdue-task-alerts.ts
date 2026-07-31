import { inngest } from "../client";
import { db } from "@/lib/db";
import { tasks, notifications } from "@/lib/db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { startOfDay } from "date-fns";

export const overdueTaskAlerts = inngest.createFunction(
  {
    id: "overdue-task-alerts",
    name: "Overdue Task Alerts",
    triggers: { cron: "0 8 * * *" },
  },
  async ({ step }) => {
    const result = await step.run("notify-overdue-tasks", async () => {
      const now = startOfDay(new Date());

      const overdueTasks = await db
        .select({
          id: tasks.id,
          orgId: tasks.orgId,
          title: tasks.title,
          assigneeId: tasks.assigneeId,
          dueDate: tasks.dueDate,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.status, "pending"),
            isNotNull(tasks.dueDate),
            lt(tasks.dueDate, now),
          ),
        );

      if (overdueTasks.length === 0) return { notified: 0, taskCount: 0 };

      const byAssignee = new Map<string, { orgId: string; count: number; taskIds: number[] }>();

      for (const task of overdueTasks) {
        if (!task.assigneeId) continue;
        const entry = byAssignee.get(task.assigneeId);
        if (entry) {
          entry.count++;
          entry.taskIds.push(task.id);
        } else {
          byAssignee.set(task.assigneeId, {
            orgId: task.orgId,
            count: 1,
            taskIds: [task.id],
          });
        }
      }

      let notifiedCount = 0;

      for (const [assigneeId, info] of byAssignee) {
        const message =
          info.count === 1
            ? "You have 1 overdue task. Please action it today."
            : `You have ${info.count} overdue tasks. Please action them today.`;

        await db.insert(notifications).values({
          orgId: info.orgId,
          userId: assigneeId,
          type: "WARNING",
          title: info.count === 1 ? "Overdue Task" : `${info.count} Overdue Tasks`,
          message,
          link: "/sales/activity",
          metadata: { overdueTaskIds: info.taskIds, count: info.count },
        });

        notifiedCount++;
      }

      return { notified: notifiedCount, taskCount: overdueTasks.length };
    });

    return result;
  },
);
