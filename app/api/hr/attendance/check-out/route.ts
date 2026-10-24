import { withAuth, ok, err, userErrorOr500 } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { timesheets } from "@/lib/db/schema/projects";
import { eq, and, desc, isNull } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";
import { notifyHrEmployeeCheckOut } from "@/lib/hr/attendance-hr-notifications";
import { OVERTIME_PROMPT_MIN_HOURS } from "@/lib/hr/payroll-calculations";
import { getWorkLogBlockReason } from "@/lib/hr/work-log-guard";
import { hasWorkLogContent } from "@/lib/hr/work-log-completion";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    // Org-timezone today, the same key the status, break and check-out
    // queries use. Trusting the browser's date wrote rows the status read
    // never found (R3-EMP-01).
    const today = getTodayString();

    const workLogBlocked = await getWorkLogBlockReason(
      session.orgId,
      session.user.id,
      today,
    );
    if (!workLogBlocked) {
      const todayWorkLogs = await db.query.timesheets.findMany({
        where: and(
          eq(timesheets.orgId, session.orgId),
          eq(timesheets.userId, session.user.id),
          eq(timesheets.date, today),
        ),
        columns: { hours: true, description: true },
      });
      if (!hasWorkLogContent(todayWorkLogs)) {
        return err(
          "Please finish and save today's work log before clocking out.",
          400,
        );
      }
    }

    try {
      let checkoutAt = new Date();
      let totalDailyWork = 0;
      await db.transaction(async (tx) => {
        const result = await tx
          .select()
          .from(attendance)
          .where(
            and(
              eq(attendance.userId, session.user.id),
              eq(attendance.date, today),
              eq(attendance.orgId, session.orgId),
              isNull(attendance.checkOut)
            )
          )
          .orderBy(desc(attendance.createdAt))
          .limit(1)
          .for("update");

        const log = result[0];
        if (!log) throw new Error("You must punch in before checking out.");
        if (!log.checkIn) throw new Error("No active check-in found. Please punch in first.");

        const now = new Date();
        checkoutAt = now;
        let totalBreakHours = Number(log.breakHours) || 0;
        const breaks =
          (log.breaks as unknown as { start: string; end?: string }[]) || [];
        const updatedBreaks = [...breaks];

        const lastBreak = updatedBreaks[updatedBreaks.length - 1];
        if (lastBreak && !lastBreak.end) {
          lastBreak.end = now.toISOString();
          const start = new Date(lastBreak.start);
          const duration = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
          totalBreakHours += Math.max(0, duration);
        }

        const checkInTime = new Date(log.checkIn);
        const durationMs = Math.max(0, now.getTime() - checkInTime.getTime());
        const sessionWorkHours = Math.max(
          0,
          durationMs / (1000 * 60 * 60) - totalBreakHours
        );

        const todayLogs = await tx.query.attendance.findMany({
          where: and(
            eq(attendance.userId, session.user.id),
            eq(attendance.date, today),
            eq(attendance.orgId, session.orgId)
          ),
        });

        let previousWorkHours = 0;
        for (const l of todayLogs) {
          if (l.id !== log.id) {
            previousWorkHours += Number(l.workHours || 0);
          }
        }

        totalDailyWork = previousWorkHours + sessionWorkHours;
        const isOvertime = totalDailyWork > 8;

        await tx
          .update(attendance)
          .set({
            checkOut: now,
            status: "PRESENT",
            workHours: sessionWorkHours.toFixed(2),
            breakHours: totalBreakHours.toFixed(2),
            breaks: updatedBreaks,
            isOvertime,
          })
          .where(eq(attendance.id, log.id));
      });

      notifyHrEmployeeCheckOut({
        orgId: session.orgId,
        employeeId: session.user.id,
        employeeName: session.user.name ?? null,
        employeeEmail: session.user.email ?? null,
        date: today,
        at: checkoutAt,
      });

      return ok({
        success: true,
        date: today,
        totalWorkHours: Math.round(totalDailyWork * 100) / 100,
        shouldLogOvertime: totalDailyWork > OVERTIME_PROMPT_MIN_HOURS,
      });
    } catch (e) {
      return userErrorOr500(e, { route: "hr/attendance/check-out", orgId: session.orgId }, "Check-out failed.");
    }
  }, req);
}
