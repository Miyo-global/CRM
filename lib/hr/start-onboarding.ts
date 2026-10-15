import "server-only";

import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  departmentMembers,
  onboardingTasks,
  onboardingTemplates,
  onboardingTemplateSteps,
} from "@/lib/db/schema";

/** Fallback checklist when the org has no onboarding template. */
const DEFAULT_TASKS: {
  title: string;
  description: string;
  ownerRole: string;
  dueOffsetDays: number;
}[] = [
  { title: "IT Setup", description: "Set up workstation, email, and required software access.", ownerRole: "IT", dueOffsetDays: 1 },
  { title: "HR Orientation", description: "Attend HR orientation session covering company policies and benefits.", ownerRole: "HR", dueOffsetDays: 2 },
  { title: "Department Intro", description: "Meet with the department head and team for a role overview.", ownerRole: "MANAGER", dueOffsetDays: 3 },
  { title: "Policy Review", description: "Read and acknowledge the employee handbook and code of conduct.", ownerRole: "NEW_HIRE", dueOffsetDays: 5 },
  { title: "Manager Introduction", description: "One-on-one meeting with direct manager to align on goals.", ownerRole: "MANAGER", dueOffsetDays: 7 },
  { title: "POSH Training Acknowledgement", description: "Complete mandatory Prevention of Sexual Harassment (POSH) awareness training and sign acknowledgement.", ownerRole: "NEW_HIRE", dueOffsetDays: 3 },
  { title: "Code of Conduct Sign-Off", description: "Read and digitally sign the company Code of Conduct document.", ownerRole: "NEW_HIRE", dueOffsetDays: 5 },
];

export interface StartOnboardingResult {
  tasksCreated: number;
  alreadyStarted: boolean;
}

/**
 * Create the onboarding checklist for a new hire.
 *
 * Called by the Add Employee wizard right after the employee is created, so a
 * successful hire always shows up under Onboarding › Progress (A21), and by the
 * manual "initiate onboarding" endpoint. Idempotent: a user who already has
 * tasks is left alone.
 */
export async function startOnboardingForUser(opts: {
  orgId: string;
  userId: string;
  /** Checklist due dates count from this date (the joining date). */
  joiningDate?: Date | string | null;
}): Promise<StartOnboardingResult> {
  const existing = await db
    .select({ id: onboardingTasks.id })
    .from(onboardingTasks)
    .where(and(eq(onboardingTasks.userId, opts.userId), eq(onboardingTasks.orgId, opts.orgId)))
    .limit(1);
  if (existing.length > 0) return { tasksCreated: 0, alreadyStarted: true };

  const baseDate = opts.joiningDate ? new Date(opts.joiningDate) : new Date();

  const [deptMember] = await db
    .select({ departmentId: departmentMembers.departmentId })
    .from(departmentMembers)
    .where(eq(departmentMembers.userId, opts.userId))
    .limit(1);
  const employeeDeptId = deptMember?.departmentId ?? null;

  const allTemplates = await db
    .select({ id: onboardingTemplates.id, departmentId: onboardingTemplates.departmentId })
    .from(onboardingTemplates)
    .where(
      and(
        eq(onboardingTemplates.orgId, opts.orgId),
        eq(onboardingTemplates.isActive, true),
        employeeDeptId !== null
          ? or(
              eq(onboardingTemplates.departmentId, employeeDeptId),
              isNull(onboardingTemplates.departmentId),
            )
          : isNull(onboardingTemplates.departmentId),
      ),
    );

  const template =
    allTemplates.find((t) => t.departmentId === employeeDeptId) ??
    allTemplates.find((t) => t.departmentId === null) ??
    null;

  const withDueDate = (dueOffsetDays: number) => {
    const due = new Date(baseDate);
    due.setDate(due.getDate() + dueOffsetDays);
    return due;
  };

  if (template) {
    const steps = await db
      .select()
      .from(onboardingTemplateSteps)
      .where(eq(onboardingTemplateSteps.templateId, template.id))
      .orderBy(onboardingTemplateSteps.sortOrder);

    const otherTemplateIds = allTemplates.filter((t) => t.id !== template.id).map((t) => t.id);
    const extraComplianceSteps =
      otherTemplateIds.length > 0
        ? await db
            .select()
            .from(onboardingTemplateSteps)
            .where(
              and(
                inArray(onboardingTemplateSteps.templateId, otherTemplateIds),
                eq(onboardingTemplateSteps.isComplianceItem, true),
              ),
            )
        : [];

    const allSteps = [...steps, ...extraComplianceSteps];
    if (allSteps.length > 0) {
      const taskInserts = allSteps.map((step) => ({
        userId: opts.userId,
        orgId: opts.orgId,
        templateStepId: step.id,
        title: step.title,
        description: step.description,
        ownerRole: step.ownerRole,
        dueDate: withDueDate(step.dueOffsetDays),
        status: "PENDING" as const,
      }));
      await db.insert(onboardingTasks).values(taskInserts);
      return { tasksCreated: taskInserts.length, alreadyStarted: false };
    }
  }

  const defaultInserts = DEFAULT_TASKS.map((t) => ({
    userId: opts.userId,
    orgId: opts.orgId,
    title: t.title,
    description: t.description,
    ownerRole: t.ownerRole,
    dueDate: withDueDate(t.dueOffsetDays),
    status: "PENDING" as const,
  }));
  await db.insert(onboardingTasks).values(defaultInserts);
  return { tasksCreated: defaultInserts.length, alreadyStarted: false };
}
