import { sendTemplateEmail } from "@/lib/email/sender";
import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { appraisals, appraisalStages, organizationMembers, performanceImprovementPlans, pipCheckIns, users } from "@/lib/db/schema";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { logger } from "@/lib/logger";

const base = appUrl;

/** "SELF_REVIEW" reads as "self review" in a sentence. */
function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ").toLowerCase();
}

/** "20 April 2026" for a timestamp. */
function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function daysBetween(start: string, end: string): number {
  return Math.max(
    0,
    Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000),
  );
}

export async function notifyNewAppraisalAssignee(appraisalId: number): Promise<void> {
  const row = await db.query.appraisals.findFirst({
    where: eq(appraisals.id, appraisalId),
    with: { user: { columns: { name: true, email: true } } },
  });
  const pending = await db.query.appraisalStages.findFirst({
    where: and(eq(appraisalStages.appraisalId, appraisalId), eq(appraisalStages.status, "PENDING")),
    orderBy: (s, { asc }) => [asc(s.id)],
  });
  if (!row || !pending?.assigneeId) return;
  const assignee = await db.query.users.findFirst({
    where: eq(users.id, pending.assigneeId),
    columns: { email: true, name: true },
  });
  if (!assignee?.email) return;
  // MIYO-0262: the hand-written perf-appraisal-stage-assigned template.
  await sendTemplateEmail("perf-appraisal-stage-assigned", {
    to: assignee.email,
    category: "hr",
    vars: {
      employee_name: row.user?.name ?? "Employee",
      stage_label: stageLabel(pending.stage),
      due_date: pending.dueAt ? dayLabel(pending.dueAt) : "not set",
      appraisal_url: `${base}/hr/performance?tab=appraisals`,
    },
  });
}

export async function notifyAppraisalClosedFanOut(appraisalId: number): Promise<void> {
  const row = await db.query.appraisals.findFirst({
    where: eq(appraisals.id, appraisalId),
    with: {
      user: { columns: { id: true, name: true, email: true } },
      reviewer: { columns: { id: true, name: true, email: true } },
      cycle: { columns: { type: true, periodEnd: true } },
    },
  });
  if (!row) return;
  const hrRows = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, row.orgId), eq(organizationMembers.role, "HR")));
  const ids = new Set<string>([row.userId, row.reviewerId].filter(Boolean) as string[]);
  for (const h of hrRows) ids.add(h.userId);
  const url = `${base}/hr/performance?tab=appraisals`;
  for (const uid of ids) {
    try {
      const u = await db.query.users.findFirst({ where: eq(users.id, uid), columns: { email: true, name: true } });
      if (!u?.email) continue;
      // MIYO-0263: the hand-written perf-appraisal-finalized template.
      await sendTemplateEmail("perf-appraisal-finalized", {
        to: u.email,
        category: "hr",
        vars: {
          employee_name: row.user?.name ?? "Employee",
          cycle_name: row.cycle ? `${stageLabel(row.cycle.type)} cycle` : "the current cycle",
          rating: row.calibratedRating ?? row.overallRating ?? "not recorded",
          effective_date: row.cycle?.periodEnd ? String(row.cycle.periodEnd) : "not set",
          appraisal_url: url,
        },
      });
    } catch (e) {
      logger.error("appraisal finalized email failed", { appraisalId, uid, error: e });
    }
  }
}

export async function notifyPIPDraftCreated(pipId: number): Promise<void> {
  const row = await db.query.performanceImprovementPlans.findFirst({
    where: eq(performanceImprovementPlans.id, pipId),
    with: {
      user: { columns: { email: true, name: true } },
    },
  });
  if (!row?.user?.email) return;
  // MIYO-0266: the hand-written perf-pip-initiated template.
  await sendTemplateEmail("perf-pip-initiated", {
    to: row.user.email,
    vars: {
      start_date: String(row.startDate),
      end_date: String(row.endDate),
      duration_days: daysBetween(row.startDate, row.endDate),
      pip_url: `${base}/hr/performance?tab=pip`,
    },
  });
}

export async function notifyPIPManagerAfterAcknowledge(pipId: number): Promise<void> {
  const row = await db.query.performanceImprovementPlans.findFirst({
    where: eq(performanceImprovementPlans.id, pipId),
    with: {
      user: { columns: { name: true } },
      manager: { columns: { email: true, name: true } },
    },
  });
  if (!row?.manager?.email) return;
  // MIYO-0267: the hand-written perf-pip-manager-activated template.
  const firstCheckIn = await db.query.pipCheckIns.findFirst({
    where: eq(pipCheckIns.pipId, pipId),
    orderBy: (c, { asc }) => [asc(c.checkInDate)],
    columns: { checkInDate: true },
  });
  await sendTemplateEmail("perf-pip-manager-activated", {
    to: row.manager.email,
    vars: {
      employee_name: row.user?.name ?? "Employee",
      first_checkin: firstCheckIn?.checkInDate ? String(firstCheckIn.checkInDate) : "not scheduled",
      pip_url: `${base}/hr/performance?tab=pip`,
    },
  });
}

export async function notifyPIPOutcome(pipId: number, outcome: "SUCCESS" | "FAILED" | "EXTENDED"): Promise<void> {
  const row = await db.query.performanceImprovementPlans.findFirst({
    where: eq(performanceImprovementPlans.id, pipId),
    with: { user: { columns: { email: true, name: true } } },
  });
  if (!row?.user?.email) return;
  const pipUrl = `${base}/hr/performance?tab=pip`;

  // MIYO-0269, MIYO-0270, MIYO-0271: one template per outcome.
  if (outcome === "SUCCESS") {
    await sendTemplateEmail("perf-pip-completed", {
      to: row.user.email,
      vars: { duration_days: daysBetween(row.startDate, row.endDate) },
    });
    return;
  }
  if (outcome === "FAILED") {
    await sendTemplateEmail("perf-pip-not-successful", {
      to: row.user.email,
      vars: { pip_url: pipUrl },
    });
    return;
  }
  await sendTemplateEmail("perf-pip-extended", {
    to: row.user.email,
    vars: { end_date: String(row.endDate), pip_url: pipUrl },
  });
}

export async function sendAppraisalDueRemindersForTomorrow(): Promise<{ sent: number }> {
  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const tomorrow = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + 1, 0, 0, 0, 0) - IST_OFFSET_MS
  );
  const end = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000 - 1);

  const rows = await db
    .select({
      id: appraisalStages.id,
      assigneeId: appraisalStages.assigneeId,
      stage: appraisalStages.stage,
      employeeName: users.name,
    })
    .from(appraisalStages)
    .innerJoin(appraisals, eq(appraisals.id, appraisalStages.appraisalId))
    .leftJoin(users, eq(users.id, appraisals.userId))
    .where(
      and(
        eq(appraisalStages.status, "PENDING"),
        gte(appraisalStages.dueAt, tomorrow),
        lte(appraisalStages.dueAt, end)
      )
    );

  let sent = 0;
  const url = `${base}/hr/performance?tab=appraisals`;
  const ymd = new Date(tomorrow.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  for (const r of rows) {
    if (!r.assigneeId) continue;
    try {
      const u = await db.query.users.findFirst({
        where: eq(users.id, r.assigneeId),
        columns: { email: true, name: true },
      });
      if (!u?.email) continue;
      // MIYO-0264: the hand-written perf-appraisal-due-reminder template.
      await sendTemplateEmail("perf-appraisal-due-reminder", {
        to: u.email,
        category: "hr",
        vars: {
          employee_name: r.employeeName ?? "an employee",
          stage_label: stageLabel(r.stage),
          due_date: ymd,
          appraisal_url: url,
        },
      });
      sent += 1;
    } catch (e) {
      logger.error("appraisal reminder email failed", { stageId: r.id, error: e });
    }
  }
  return { sent };
}

export async function sendPIPCheckInDueRemindersForTomorrow(): Promise<{ sent: number }> {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const ymd = tomorrow.toISOString().slice(0, 10);
  const url = `${base}/hr/performance?tab=pip`;

  const rows = await db
    .select({
      checkInId: pipCheckIns.id,
      pipId: pipCheckIns.pipId,
      userId: performanceImprovementPlans.userId,
      managerId: performanceImprovementPlans.managerId,
      employeeName: users.name,
    })
    .from(pipCheckIns)
    .innerJoin(performanceImprovementPlans, eq(pipCheckIns.pipId, performanceImprovementPlans.id))
    .leftJoin(users, eq(users.id, performanceImprovementPlans.userId))
    .where(
      and(
        inArray(performanceImprovementPlans.status, ["ACTIVE", "EXTENDED"]),
        or(eq(pipCheckIns.periodEnd, ymd), eq(pipCheckIns.checkInDate, ymd)),
        or(isNull(pipCheckIns.managerAckAt), isNull(pipCheckIns.employeeAckAt))
      )
    );

  let sent = 0;
  const emailed = new Set<string>();
  for (const r of rows) {
    for (const uid of [r.userId, r.managerId]) {
      const key = `${r.checkInId}:${uid}`;
      if (emailed.has(key)) continue;
      try {
        const u = await db.query.users.findFirst({
          where: eq(users.id, uid),
          columns: { email: true, name: true },
        });
        if (!u?.email) continue;
        // MIYO-0268: the hand-written perf-pip-checkin-reminder template.
        await sendTemplateEmail("perf-pip-checkin-reminder", {
          to: u.email,
          vars: {
            employee_name: r.employeeName ?? "the employee",
            due_date: ymd,
            pip_url: url,
          },
        });
        emailed.add(key);
        sent += 1;
      } catch (e) {
        logger.error("pip check-in reminder email failed", { checkInId: r.checkInId, uid, error: e });
      }
    }
  }
  return { sent };
}

export function scheduleAppraisalPipEmails(fn: () => Promise<void>): void {
  void fn().catch((e) => logger.error("appraisal/pip email async failed", { error: e }));
}
