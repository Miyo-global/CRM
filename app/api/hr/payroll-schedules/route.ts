import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrollSchedules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { getErrorMessage } from "@/lib/get-error-message";

export interface PayrollScheduleDto {
  id: number | null;
  frequency: "MONTHLY";
  dayOfMonth: number;
  isEnabled: boolean;
  autoApprove: boolean;
  lastRunPeriod: string | null;
  lastRunAt: string | null;
}

const DEFAULT_SCHEDULE: PayrollScheduleDto = {
  id: null,
  frequency: "MONTHLY",
  dayOfMonth: 1,
  isEnabled: false,
  autoApprove: false,
  lastRunPeriod: null,
  lastRunAt: null,
};

const updateScheduleSchema = z.object({
  frequency: z.literal("MONTHLY").default("MONTHLY"),
  dayOfMonth: z.number().int().min(1).max(28),
  isEnabled: z.boolean(),
  autoApprove: z.boolean(),
});

export async function GET() {
  return withAdmin(async (session) => {
    const row = await db.query.payrollSchedules.findFirst({
      where: eq(payrollSchedules.orgId, session.orgId),
    });
    if (!row) return ok(DEFAULT_SCHEDULE);
    return ok({
      id: row.id,
      frequency: "MONTHLY",
      dayOfMonth: row.dayOfMonth ?? 1,
      isEnabled: row.isEnabled ?? false,
      autoApprove: row.autoApprove ?? false,
      lastRunPeriod: row.lastRunPeriod ?? null,
      lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
    } satisfies PayrollScheduleDto);
  });
}

export async function PUT(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, updateScheduleSchema);

    let saved;
    try {
      [saved] = await db
        .insert(payrollSchedules)
        .values({
          orgId: session.orgId,
          frequency: body.frequency,
          dayOfMonth: body.dayOfMonth,
          isEnabled: body.isEnabled,
          autoApprove: body.autoApprove,
          createdById: session.user.id,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: payrollSchedules.orgId,
          set: {
            frequency: body.frequency,
            dayOfMonth: body.dayOfMonth,
            isEnabled: body.isEnabled,
            autoApprove: body.autoApprove,
            updatedAt: new Date(),
          },
        })
        .returning();
    } catch (e) {
      return err(`Could not save payroll schedule: ${getErrorMessage(e)}`, 500);
    }

    void createAuditLog({
      action: "hr.payroll_schedule_updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(saved.id),
      targetType: "payroll_schedule",
      metadata: {
        dayOfMonth: body.dayOfMonth,
        isEnabled: body.isEnabled,
        autoApprove: body.autoApprove,
      },
    }).catch(() => {});

    return ok({
      id: saved.id,
      frequency: "MONTHLY",
      dayOfMonth: saved.dayOfMonth ?? body.dayOfMonth,
      isEnabled: saved.isEnabled ?? body.isEnabled,
      autoApprove: saved.autoApprove ?? body.autoApprove,
      lastRunPeriod: saved.lastRunPeriod ?? null,
      lastRunAt: saved.lastRunAt ? saved.lastRunAt.toISOString() : null,
    } satisfies PayrollScheduleDto);
  });
}
