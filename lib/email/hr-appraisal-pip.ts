import { sendEmail } from "@/lib/email/sender";
import {
  getAppraisalStageAssignedEmail,
  getAppraisalFinalApprovedEmail,
  getPIPInitiatedEmail,
  getPIPManagerActivatedEmail,
  getPIPSuccessEmail,
  getPIPFailedEmail,
  getPIPExtendedEmail,
  getAppraisalDueReminderEmail,
  getPIPCheckInDueReminderEmail,
} from "@/lib/email-templates/appraisal";
import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { appraisals, appraisalStages, organizationMembers, performanceImprovementPlans, pipCheckIns, users } from "@/lib/db/schema";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { logger } from "@/lib/logger";

const base = appUrl;

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
  const url = `${base}/hr/performance?tab=appraisals`;
  await sendEmail({
    to: assignee.email,
    subject: "Appraisal — action required",
    html: getAppraisalStageAssignedEmail(
      assignee.name ?? "there",
      pending.stage.replace(/_/g, " "),
      row.user?.name ?? "Employee",
      url
    ),
  });
}

export async function notifyAppraisalClosedFanOut(appraisalId: number): Promise<void> {
  const row = await db.query.appraisals.findFirst({
    where: eq(appraisals.id, appraisalId),
    with: {
      user: { columns: { id: true, name: true, email: true } },
      reviewer: { columns: { id: true, name: true, email: true } },
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
      await sendEmail({
        to: u.email,
        subject: `Appraisal finalized — ${row.user?.name ?? "Employee"}`,
        html: getAppraisalFinalApprovedEmail(
          u.name ?? "there",
          row.user?.name ?? "Employee",
          "Current cycle",
          url
        ),
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
  const url = `${base}/hr/performance?tab=pip`;
  await sendEmail({
    to: row.user.email,
    subject: "Performance Improvement Plan initiated",
    html: getPIPInitiatedEmail(row.user.name ?? "Employee", url),
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
  const url = `${base}/hr/performance?tab=pip`;
  await sendEmail({
    to: row.manager.email,
    subject: `PIP activated — ${row.user?.name ?? "Employee"}`,
    html: getPIPManagerActivatedEmail(
      row.manager.name ?? "Manager",
      row.user?.name ?? "Employee",
      url
    ),
  });
}

export async function notifyPIPOutcome(pipId: number, outcome: "SUCCESS" | "FAILED" | "EXTENDED"): Promise<void> {
  const row = await db.query.performanceImprovementPlans.findFirst({
    where: eq(performanceImprovementPlans.id, pipId),
    with: { user: { columns: { email: true, name: true } } },
  });
  if (!row?.user?.email) return;
  const name = row.user.name ?? "Employee";
  const html =
    outcome === "SUCCESS"
      ? getPIPSuccessEmail(name)
      : outcome === "FAILED"
        ? getPIPFailedEmail(name)
        : getPIPExtendedEmail(name);
  await sendEmail({
    to: row.user.email,
    subject:
      outcome === "SUCCESS" ? "PIP successfully completed" : outcome === "FAILED" ? "PIP outcome — not successful" : "PIP extended",
    html,
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
    })
    .from(appraisalStages)
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
      await sendEmail({
        to: u.email,
        subject: `Due tomorrow: ${r.stage}`,
        html: getAppraisalDueReminderEmail(u.name ?? "there", r.stage.replace(/_/g, " "), ymd, url),
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
    })
    .from(pipCheckIns)
    .innerJoin(performanceImprovementPlans, eq(pipCheckIns.pipId, performanceImprovementPlans.id))
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
        await sendEmail({
          to: u.email,
          subject: "PIP check-in due tomorrow",
          html: getPIPCheckInDueReminderEmail(u.name ?? "there", ymd, url),
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
