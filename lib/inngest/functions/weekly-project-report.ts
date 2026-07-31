import { inngest } from "../client";
import { db } from "@/lib/db";
import { projects, tickets, organizations, organizationMembers, projectMilestones } from "@/lib/db/schema";
import { eq, and, count, sql, gte } from "drizzle-orm";
import { subDays } from "date-fns";
import { createNotification } from "@/server/actions/create-notification";
import { logger } from "@/lib/logger";

export const weeklyProjectReport = inngest.createFunction(
  {
    id: "weekly-project-report",
    name: "Weekly Project Status Report",
    triggers: { cron: "0 7 * * 1" },
  },
  async ({ step }) => {
    const orgs = await step.run("fetch-orgs", () =>
      db.select({ id: organizations.id }).from(organizations),
    );

    let totalReportsSent = 0;

    for (const org of orgs) {
      await step.run(`project-report-${org.id}`, async () => {
        const activeProjects = await db.query.projects.findMany({
          where: and(eq(projects.orgId, org.id), eq(projects.status, "ACTIVE")),
          columns: { id: true, name: true, key: true, managerId: true },
        });

        if (activeProjects.length === 0) return;

        const lastWeek = subDays(new Date(), 7);

        const summaries: string[] = [];

        for (const project of activeProjects) {
          const [{ openCount }] = await db
            .select({ openCount: count(tickets.id) })
            .from(tickets)
            .where(
              and(
                eq(tickets.orgId, org.id),
                eq(tickets.projectId, project.id),
                sql`${tickets.status} NOT IN ('DONE', 'CANCELLED', 'CLOSED')`,
              ),
            );

          const [{ doneCount }] = await db
            .select({ doneCount: count(tickets.id) })
            .from(tickets)
            .where(
              and(
                eq(tickets.orgId, org.id),
                eq(tickets.projectId, project.id),
                sql`${tickets.status} IN ('DONE', 'CLOSED')`,
                gte(tickets.updatedAt, lastWeek),
              ),
            );

          const [{ overdueCount }] = await db
            .select({ overdueCount: count(tickets.id) })
            .from(tickets)
            .where(
              and(
                eq(tickets.orgId, org.id),
                eq(tickets.projectId, project.id),
                sql`${tickets.status} NOT IN ('DONE', 'CANCELLED', 'CLOSED')`,
                sql`${tickets.dueDate} IS NOT NULL AND ${tickets.dueDate} < CURRENT_DATE`,
              ),
            );

          const upcomingMilestones = await db
            .select({ name: projectMilestones.name, targetDate: projectMilestones.targetDate })
            .from(projectMilestones)
            .where(
              and(
                eq(projectMilestones.projectId, project.id),
                eq(projectMilestones.status, "PENDING"),
                sql`${projectMilestones.targetDate} BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'`,
              ),
            )
            .limit(3);

          const milestoneLine =
            upcomingMilestones.length > 0
              ? ` Upcoming: ${upcomingMilestones.map((m) => m.name).join(", ")}.`
              : "";

          summaries.push(
            `[${project.key}] ${project.name}: ${openCount} open, ${doneCount} completed this week, ${overdueCount} overdue.${milestoneLine}`,
          );
        }

        const managers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.orgId, org.id),
              sql`${organizationMembers.role} IN ('CEO', 'ADMIN', 'PROJECT_MANAGER', 'BRANCH_MANAGER')`,
            ),
          );

        const body = [
          `📊 Weekly Project Status (${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })})`,
          "",
          ...summaries,
          "",
          `${activeProjects.length} active project(s) tracked.`,
        ].join("\n");

        for (const { userId } of managers) {
          try {
            await createNotification({
              orgId: org.id,
              userId,
              type: "INFO",
              title: "Weekly Project Report",
              message: body,
              link: "/projects",
            });
            totalReportsSent++;
          } catch (e) {
            logger.error("Failed to send weekly project report notification", { userId, error: e });
          }
        }
      });
    }

    return { totalReportsSent };
  },
);
