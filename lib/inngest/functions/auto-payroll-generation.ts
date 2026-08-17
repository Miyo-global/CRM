import { inngest } from "../client";
import { db } from "@/lib/db";
import { payrollSchedules, payrolls, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { generatePayrollForOrg } from "@/lib/hr/generate-payroll-for-org";
import { createAuditLog } from "@/lib/audit-log";
import { sendPayrollApprovedEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { DEFAULT_TIMEZONE } from "@/lib/constants/locale";

/** Today's date in IST, as { day, period } where period is YYYY-MM. */
function istTodayParts(): { day: number; period: string } {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(new Date());
  return { day: Number(ymd.slice(8, 10)), period: ymd.slice(0, 7) };
}

/**
 * Daily scheduled job that runs enabled, configurable payroll schedules.
 *
 * For each org whose schedule is enabled and whose dayOfMonth matches today
 * (IST) and which has not already run for the current period, it generates
 * payroll for the period, stamps lastRunPeriod / lastRunAt, and (when
 * autoApprove is on) approves the freshly generated DRAFT rows.
 *
 * Idempotent: the lastRunPeriod guard (and a row-level check) ensures the
 * period is generated at most once even if the cron fires more than once.
 */
export const autoPayrollGeneration = inngest.createFunction(
  { id: "auto-payroll-generation", name: "Automatic Payroll Generation", triggers: { cron: "0 1 * * *" } },
  async ({ step }) => {
    const { day, period } = istTodayParts();

    // Fetch every enabled schedule due today, then filter out the ones already
    // run for the current period in JS (a NULL lastRunPeriod must also pass,
    // which a SQL `ne` would drop because NULL != period is NULL).
    const schedules = await step.run("find-due-schedules", async () => {
      const rows = await db.query.payrollSchedules.findMany({
        where: and(eq(payrollSchedules.isEnabled, true), eq(payrollSchedules.dayOfMonth, day)),
      });
      return rows.filter((r) => r.lastRunPeriod !== period);
    });

    if (schedules.length === 0) {
      return { day, period, processed: 0, results: [] as unknown[] };
    }

    const results: Array<{
      orgId: string;
      generated: number;
      approved: number;
      skipped?: boolean;
      error?: string;
    }> = [];

    for (const schedule of schedules) {
      const orgId = schedule.orgId;

      try {
        const generatedBy = schedule.createdById ?? (await resolveOrgAdmin(orgId));
        if (!generatedBy) {
          results.push({ orgId, generated: 0, approved: 0, error: "no_admin_for_attribution" });
          continue;
        }

        // Generation is row-level idempotent (ON CONFLICT DO NOTHING on
        // org+user+month), so a rare duplicate cron fire cannot create double
        // payroll rows. We stamp lastRunPeriod only after a successful run so a
        // transient failure is retried by Inngest / picked up tomorrow rather
        // than being silently marked done.
        const gen = await step.run(`generate-${orgId}-${period}`, () =>
          generatePayrollForOrg({ orgId, month: period, generatedBy }),
        );

        void createAuditLog({
          action: "hr.payroll_auto_generated",
          userId: generatedBy,
          orgId,
          targetType: "payroll",
          metadata: { period, generated: gen.generated, scheduleId: schedule.id },
        }).catch(() => {});

        let approved = 0;
        if (schedule.autoApprove && gen.payrollIds.length > 0) {
          approved = await step.run(`approve-${orgId}-${period}`, () =>
            autoApprovePayrolls(orgId, gen.payrollIds, generatedBy),
          );
        }

        await step.run(`stamp-${orgId}-${period}`, async () => {
          await db
            .update(payrollSchedules)
            .set({ lastRunPeriod: period, lastRunAt: new Date(), updatedAt: new Date() })
            .where(eq(payrollSchedules.id, schedule.id));
          return true;
        });

        results.push({ orgId, generated: gen.generated, approved });
      } catch (e) {
        logger.error("Auto payroll generation failed for org", {
          orgId,
          period,
          error: e instanceof Error ? e.message : "Unknown",
        });
        results.push({
          orgId,
          generated: 0,
          approved: 0,
          error: e instanceof Error ? e.message : "Unknown",
        });
      }
    }

    return { day, period, processed: schedules.length, results };
  },
);

async function resolveOrgAdmin(orgId: string): Promise<string | null> {
  const member = await db.query.organizationMembers.findFirst({
    where: (m, { eq, and, inArray: inA }) =>
      and(eq(m.orgId, orgId), inA(m.role, ["CEO", "ADMIN"])),
    columns: { userId: true },
  });
  return member?.userId ?? null;
}

async function autoApprovePayrolls(
  orgId: string,
  payrollIds: number[],
  approvedBy: string,
): Promise<number> {
  const updated = await db
    .update(payrolls)
    .set({ status: "APPROVED", approvedBy, approvedAt: new Date() })
    .where(
      and(
        eq(payrolls.orgId, orgId),
        inArray(payrolls.id, payrollIds),
        eq(payrolls.status, "DRAFT"),
      ),
    )
    .returning({ id: payrolls.id, userId: payrolls.userId, month: payrolls.month });

  for (const row of updated) {
    void createAuditLog({
      action: "hr.payroll_approved",
      userId: approvedBy,
      orgId,
      targetId: String(row.id),
      targetType: "payroll",
      metadata: { employeeId: row.userId, month: row.month, auto: true },
    }).catch(() => {});

    if (row.userId) {
      try {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, row.userId),
          columns: { email: true, name: true },
        });
        if (employee?.email) {
          await sendPayrollApprovedEmail(
            employee.email,
            employee.name ?? "Employee",
            row.month ?? "Current Month",
            "Automatic Payroll",
          );
        }
      } catch (e) {
        logger.error("Failed to send auto-approval payroll email", {
          payrollId: row.id,
          error: e instanceof Error ? e.message : "Unknown",
        });
      }
    }
  }

  return updated.length;
}
