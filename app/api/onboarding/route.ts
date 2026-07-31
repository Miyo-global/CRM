import { type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, sql, isNull, or } from "drizzle-orm";
import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  onboardingTasks,
  onboardingTemplates,
  onboardingTemplateSteps,
  users,
  organizationMembers,
  departmentMembers,
} from "@/lib/db/schema";

export async function GET(_req: NextRequest) {
  return withAdmin(async (session) => {
    const rows = await db
      .select({
        userId: onboardingTasks.userId,
        userName: users.name,
        totalTasks: sql<number>`count(*)::int`,
        completedTasks: sql<number>`sum(case when ${onboardingTasks.status} = 'COMPLETED' then 1 else 0 end)::int`,
        lastCompletedAt: sql<string | null>`max(${onboardingTasks.completedAt})`,
      })
      .from(onboardingTasks)
      .leftJoin(users, eq(onboardingTasks.userId, users.id))
      .where(eq(onboardingTasks.orgId, session.orgId))
      .groupBy(onboardingTasks.userId, users.name);

    const result = rows.map((r) => ({
      userId: r.userId,
      userName: r.userName ?? r.userId,
      totalTasks: r.totalTasks,
      completedTasks: r.completedTasks ?? 0,
      percentComplete:
        r.totalTasks > 0
          ? Math.round(((r.completedTasks ?? 0) / r.totalTasks) * 100)
          : 0,
      lastCompletedAt: r.lastCompletedAt ?? null,
    }));

    return ok(result);
  });
}

const initiateSchema = z.object({
  userId: z.string().min(1),
});

const DEFAULT_TASKS: { title: string; description: string; ownerRole: string; dueOffsetDays: number; isComplianceItem: boolean }[] = [
  { title: "IT Setup", description: "Set up workstation, email, and required software access.", ownerRole: "IT", dueOffsetDays: 1, isComplianceItem: false },
  { title: "HR Orientation", description: "Attend HR orientation session covering company policies and benefits.", ownerRole: "HR", dueOffsetDays: 2, isComplianceItem: false },
  { title: "Department Intro", description: "Meet with the department head and team for a role overview.", ownerRole: "MANAGER", dueOffsetDays: 3, isComplianceItem: false },
  { title: "Policy Review", description: "Read and acknowledge the employee handbook and code of conduct.", ownerRole: "NEW_HIRE", dueOffsetDays: 5, isComplianceItem: true },
  { title: "Manager Introduction", description: "One-on-one meeting with direct manager to align on goals.", ownerRole: "MANAGER", dueOffsetDays: 7, isComplianceItem: false },
  { title: "POSH Training Acknowledgement", description: "Complete mandatory Prevention of Sexual Harassment (POSH) awareness training and sign acknowledgement.", ownerRole: "NEW_HIRE", dueOffsetDays: 3, isComplianceItem: true },
  { title: "Code of Conduct Sign-Off", description: "Read and digitally sign the company Code of Conduct document.", ownerRole: "NEW_HIRE", dueOffsetDays: 5, isComplianceItem: true },
];

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, initiateSchema);

    const [membership] = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, body.userId),
          eq(organizationMembers.orgId, session.orgId)
        )
      );

    if (!membership) {
      return err("User not found in this organization", 404);
    }

    const [targetUser] = await db
      .select({ id: users.id, joiningDate: users.joiningDate })
      .from(users)
      .where(eq(users.id, body.userId));

    const existing = await db
      .select({ id: onboardingTasks.id })
      .from(onboardingTasks)
      .where(and(eq(onboardingTasks.userId, body.userId), eq(onboardingTasks.orgId, session.orgId)))
      .limit(1);

    if (existing.length > 0) {
      return err("Onboarding already initiated for this user", 409);
    }

    const baseDate = targetUser?.joiningDate ? new Date(targetUser.joiningDate) : new Date();

    const [deptMember] = await db
      .select({ departmentId: departmentMembers.departmentId })
      .from(departmentMembers)
      .where(eq(departmentMembers.userId, body.userId))
      .limit(1);

    const employeeDeptId = deptMember?.departmentId ?? null;

    const allTemplates = await db
      .select({ id: onboardingTemplates.id, departmentId: onboardingTemplates.departmentId })
      .from(onboardingTemplates)
      .where(
        and(
          eq(onboardingTemplates.orgId, session.orgId),
          eq(onboardingTemplates.isActive, true),
          employeeDeptId !== null
            ? or(
                eq(onboardingTemplates.departmentId, employeeDeptId),
                isNull(onboardingTemplates.departmentId)
              )
            : isNull(onboardingTemplates.departmentId)
        )
      );

    const template =
      allTemplates.find((t) => t.departmentId === employeeDeptId) ??
      allTemplates.find((t) => t.departmentId === null) ??
      null;

    if (template) {
      const steps = await db
        .select()
        .from(onboardingTemplateSteps)
        .where(eq(onboardingTemplateSteps.templateId, template.id))
        .orderBy(onboardingTemplateSteps.sortOrder);

      const otherTemplateIds = allTemplates
        .filter((t) => t.id !== template.id)
        .map((t) => t.id);

      let extraComplianceSteps: (typeof steps) = [];
      if (otherTemplateIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        extraComplianceSteps = await db
          .select()
          .from(onboardingTemplateSteps)
          .where(
            and(
              inArray(onboardingTemplateSteps.templateId, otherTemplateIds),
              eq(onboardingTemplateSteps.isComplianceItem, true)
            )
          );
      }

      const allSteps = [...steps, ...extraComplianceSteps];

      if (allSteps.length > 0) {
        const taskInserts = allSteps.map((step) => {
          const due = new Date(baseDate);
          due.setDate(due.getDate() + step.dueOffsetDays);
          return {
            userId: body.userId,
            orgId: session.orgId,
            templateStepId: step.id,
            title: step.title,
            description: step.description,
            ownerRole: step.ownerRole,
            dueDate: due,
            status: "PENDING" as const,
          };
        });
        await db.insert(onboardingTasks).values(taskInserts);
        return ok({ success: true, tasksCreated: taskInserts.length });
      }
    }

    const defaultInserts = DEFAULT_TASKS.map((t) => {
      const due = new Date(baseDate);
      due.setDate(due.getDate() + t.dueOffsetDays);
      return {
        userId: body.userId,
        orgId: session.orgId,
        title: t.title,
        description: t.description,
        ownerRole: t.ownerRole,
        dueDate: due,
        status: "PENDING" as const,
      };
    });
    await db.insert(onboardingTasks).values(defaultInserts);
    return ok({ success: true, tasksCreated: defaultInserts.length });
  });
}
