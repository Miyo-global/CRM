import { inngest } from "../client";
import { db } from "@/lib/db";
import {
  onboardingTasks,
  onboardingTemplates,
  users,
  notifications,
  organizationMembers,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { addDays, format } from "date-fns";
import { logger } from "@/lib/logger";
import { sendOnboardingWelcomeEmail, sendOnboardingTaskEmail } from "@/lib/email";

const DEFAULT_TASKS: {
  title: string;
  description: string;
  ownerRole: string;
  dueOffsetDays: number;
}[] = [
  {
    title: "IT Setup",
    description: "Set up workstation, email, and required software access.",
    ownerRole: "IT",
    dueOffsetDays: 1,
  },
  {
    title: "HR Orientation",
    description: "Attend HR orientation session covering company policies and benefits.",
    ownerRole: "HR",
    dueOffsetDays: 2,
  },
  {
    title: "Department Introduction",
    description: "Meet with the department head and team for a role overview.",
    ownerRole: "MANAGER",
    dueOffsetDays: 3,
  },
  {
    title: "Policy Review",
    description: "Read and acknowledge the employee handbook and code of conduct.",
    ownerRole: "NEW_HIRE",
    dueOffsetDays: 5,
  },
  {
    title: "Manager One-on-One",
    description: "Initial one-on-one meeting with direct manager to align on 90-day goals.",
    ownerRole: "MANAGER",
    dueOffsetDays: 7,
  },
  {
    title: "Benefits Enrollment",
    description: "Complete benefits enrollment form with the HR team.",
    ownerRole: "HR",
    dueOffsetDays: 7,
  },
  {
    title: "Security & Compliance Training",
    description: "Complete mandatory data security and compliance training module.",
    ownerRole: "NEW_HIRE",
    dueOffsetDays: 14,
  },
];

export const initiateOnboarding = inngest.createFunction(
  {
    id: "initiate-onboarding",
    name: "Auto-Initiate Employee Onboarding",
    triggers: { event: "hr/employee.onboarded" },
  },
  async ({ event, step }) => {
    const { userId, orgId, joiningDate } = event.data;

    await step.run("create-onboarding-tasks", async () => {
      const existingTasks = await db
        .select({ id: onboardingTasks.id })
        .from(onboardingTasks)
        .where(and(eq(onboardingTasks.userId, userId), eq(onboardingTasks.orgId, orgId)));

      if (existingTasks.length > 0) {
        logger.info("Onboarding tasks already exist for user", { userId, orgId });
        return { skipped: true };
      }

      const baseDate = joiningDate ? new Date(joiningDate) : new Date();

      const defaultTemplate = await db.query.onboardingTemplates.findFirst({
        where: and(
          eq(onboardingTemplates.orgId, orgId),
          eq(onboardingTemplates.isActive, true)
        ),
        with: {
          steps: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
        },
      });

      let taskInserts: typeof onboardingTasks.$inferInsert[];

      if (defaultTemplate?.steps && defaultTemplate.steps.length > 0) {
        taskInserts = defaultTemplate.steps.map((tmplStep) => ({
          orgId,
          userId,
          title: tmplStep.title,
          description: tmplStep.description ?? "",
          ownerRole: tmplStep.ownerRole ?? "HR",
          dueDate: addDays(baseDate, tmplStep.dueOffsetDays),
          status: "PENDING" as const,
          templateStepId: tmplStep.id,
        }));
      } else {
        taskInserts = DEFAULT_TASKS.map((t) => ({
          orgId,
          userId,
          title: t.title,
          description: t.description,
          ownerRole: t.ownerRole,
          dueDate: addDays(baseDate, t.dueOffsetDays),
          status: "PENDING" as const,
        }));
      }

      await db.insert(onboardingTasks).values(taskInserts);
      return { tasksCreated: taskInserts.length };
    });

    await step.run("send-welcome-onboarding-email", async () => {
      const employee = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true, email: true, designation: true },
      });

      if (!employee?.email) return { skipped: true };

      const taskCount = await db
        .select({ id: onboardingTasks.id })
        .from(onboardingTasks)
        .where(and(eq(onboardingTasks.userId, userId), eq(onboardingTasks.orgId, orgId)));

      const dateStr = joiningDate ? format(new Date(joiningDate), "dd MMM yyyy") : "Today";

      await sendOnboardingWelcomeEmail(
        employee.email,
        employee.name ?? "Team Member",
        employee.designation ?? "Team Member",
        dateStr,
        taskCount.length
      );

      return { sent: true };
    });

    await step.run("notify-hr-and-manager", async () => {
      const employee = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true, reportingTo: true },
      });

      const employeeName = employee?.name ?? "New Employee";

      const createdTasks = await db
        .select({ ownerRole: onboardingTasks.ownerRole })
        .from(onboardingTasks)
        .where(and(eq(onboardingTasks.userId, userId), eq(onboardingTasks.orgId, orgId)));

      const taskRoles = new Set(createdTasks.map((t) => t.ownerRole));

      const notificationRows: typeof notifications.$inferInsert[] = [];

      const emailPromises: Promise<void>[] = [];

      if (taskRoles.has("HR")) {
        const hrMembers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, "HR")));

        const hrTaskCount = createdTasks.filter((t) => t.ownerRole === "HR").length;

        for (const m of hrMembers) {
          notificationRows.push({
            orgId,
            userId: m.userId,
            type: "INFO" as const,
            title: "Onboarding Started",
            message: `Onboarding tasks have been automatically created for ${employeeName}. You have HR tasks assigned.`,
            link: `/hr/onboarding`,
          });

          const hrUser = await db.query.users.findFirst({
            where: eq(users.id, m.userId),
            columns: { email: true, name: true },
          });
          if (hrUser?.email) {
            emailPromises.push(
              sendOnboardingTaskEmail(hrUser.email, hrUser.name ?? "HR", employeeName, "HR", hrTaskCount)
            );
          }
        }
      }

      if (taskRoles.has("IT")) {
        const itMembers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.role, "IT")));

        const itTaskCount = createdTasks.filter((t) => t.ownerRole === "IT").length;

        for (const m of itMembers) {
          notificationRows.push({
            orgId,
            userId: m.userId,
            type: "INFO" as const,
            title: "IT Onboarding Tasks Assigned",
            message: `New hire ${employeeName} has started onboarding. You have IT setup tasks assigned.`,
            link: `/hr/onboarding`,
          });

          const itUser = await db.query.users.findFirst({
            where: eq(users.id, m.userId),
            columns: { email: true, name: true },
          });
          if (itUser?.email) {
            emailPromises.push(
              sendOnboardingTaskEmail(itUser.email, itUser.name ?? "IT", employeeName, "IT", itTaskCount)
            );
          }
        }
      }

      if (taskRoles.has("MANAGER") && employee?.reportingTo) {
        notificationRows.push({
          orgId,
          userId: employee.reportingTo,
          type: "INFO" as const,
          title: "Onboarding Tasks Assigned",
          message: `${employeeName} has started onboarding. You have manager tasks assigned (introductions and 1-on-1).`,
          link: `/hr/onboarding`,
        });

        const managerTaskCount = createdTasks.filter((t) => t.ownerRole === "MANAGER").length;
        const manager = await db.query.users.findFirst({
          where: eq(users.id, employee.reportingTo),
          columns: { email: true, name: true },
        });
        if (manager?.email) {
          emailPromises.push(
            sendOnboardingTaskEmail(manager.email, manager.name ?? "Manager", employeeName, "MANAGER", managerTaskCount)
          );
        }
      }

      if (notificationRows.length === 0) return { notified: 0 };

      await db.insert(notifications).values(notificationRows);

      await Promise.allSettled(emailPromises);

      return { notified: notificationRows.length };
    });

    return { userId, orgId, initiated: true };
  }
);
