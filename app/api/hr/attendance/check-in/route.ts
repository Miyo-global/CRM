import { withAuth, ok, err, userErrorOr500 } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance, holidays, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { parseAttendancePunchBody } from "@/lib/validations/attendance";
import { getTodayString } from "@/lib/date-utils";
import { notifyHrEmployeeCheckIn } from "@/lib/hr/attendance-hr-notifications";
import {
  getLateCutoffMinutesIst,
  handleLateArrivalAfterCheckIn,
  minutesSinceMidnightIst,
} from "@/lib/hr/late-arrival-after-check-in";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = parseAttendancePunchBody(await req.json().catch(() => ({})));
    // Org-timezone today, the same key the status, break and check-out
    // queries use. Trusting the browser's date wrote rows the status read
    // never found (R3-EMP-01).
    const today = getTodayString();

    const todayDate = new Date(today + "T00:00:00");
    const isSunday = todayDate.getDay() === 0;

    try {
      // No attendance before the employee starts (QA-0035).
      const employee = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { joiningDate: true },
      });
      if (employee?.joiningDate && today < String(employee.joiningDate).slice(0, 10)) {
        return err(
          `You cannot check in before your joining date (${String(employee.joiningDate).slice(0, 10)}).`,
          400,
        );
      }

      const holiday = await db.query.holidays.findFirst({
        where: and(eq(holidays.orgId, session.orgId), eq(holidays.date, today)),
        columns: { id: true, name: true },
      });

      let attendanceId: number | undefined;
      let isFreshInsert = false;
      const checkInAt = new Date();
      let punchAtForHr: Date = checkInAt;
      const workdayForLateRule = !holiday && !isSunday;
      const lateCutoff = getLateCutoffMinutesIst();
      const isLateFirstPunch = workdayForLateRule && minutesSinceMidnightIst(checkInAt) > lateCutoff;

      await db.transaction(async (tx) => {
        const result = await tx
          .select()
          .from(attendance)
          .where(
            and(
              eq(attendance.userId, session.user.id),
              eq(attendance.date, today),
              eq(attendance.orgId, session.orgId)
            )
          )
          .orderBy(desc(attendance.createdAt))
          .limit(1)
          .for("update");

        const existing = result[0];

        if (existing) {
          // An auto-absent row (status ABSENT, no check-in) used to look like
          // an open shift, so a late arrival could neither check in nor out
          // for the rest of the day (QA-0005). A real punch supersedes it.
          if (!existing.checkIn) {
            await tx
              .update(attendance)
              .set({
                checkIn: checkInAt,
                checkOut: null,
                status: isLateFirstPunch ? "LATE" : "PRESENT",
                locationData: body.location ?? null,
                isHolidayWork: !!holiday,
                isSundayWork: isSunday && !holiday,
                holidayId: holiday?.id ?? null,
              })
              .where(eq(attendance.id, existing.id));
            attendanceId = existing.id;
            isFreshInsert = true;
            return;
          }

          if (!existing.checkOut) {
            throw new Error("Already checked in");
          }

          const lastCheckOut = new Date(existing.checkOut);
          const cooldownDiff = new Date().getTime() - lastCheckOut.getTime();
          const diffMinutes = cooldownDiff / (1000 * 60);
          if (diffMinutes < 2) {
            throw new Error("Please wait 2 minutes before clocking in again.");
          }

          const now = new Date();
          punchAtForHr = now;
          const gapMs = now.getTime() - lastCheckOut.getTime();
          const MAX_AUTO_BREAK_HOURS = 8;
          const gapHours = Math.min(
            gapMs / (1000 * 60 * 60),
            MAX_AUTO_BREAK_HOURS
          );

          const currentBreaks = (existing.breaks as { start: string; end?: string }[]) || [];
          const newBreaks = [
            ...currentBreaks,
            { start: lastCheckOut.toISOString(), end: now.toISOString() },
          ];
          const newBreakHours = (Number(existing.breakHours) || 0) + gapHours;

          await tx.update(attendance).set({
            status: "PRESENT",
            checkOut: null,
            breaks: newBreaks,
            breakHours: newBreakHours.toFixed(2),
          }).where(eq(attendance.id, existing.id));

          attendanceId = existing.id;
          return;
        }

        const [inserted] = await tx.insert(attendance).values({
          orgId: session.orgId,
          userId: session.user.id,
          date: today,
          checkIn: checkInAt,
          status: isLateFirstPunch ? "LATE" : "PRESENT",
          locationData: body.location ?? null,
          isHolidayWork: !!holiday,
          isSundayWork: isSunday && !holiday,
          holidayId: holiday?.id ?? null,
        }).returning({ id: attendance.id });

        attendanceId = inserted.id;
        isFreshInsert = true;
      });

      notifyHrEmployeeCheckIn({
        orgId: session.orgId,
        employeeId: session.user.id,
        employeeName: session.user.name ?? null,
        employeeEmail: session.user.email ?? null,
        date: today,
        at: punchAtForHr,
        isOrgHoliday: !!holiday,
        holidayName: holiday?.name ?? null,
        isSunday: isSunday && !holiday,
      });

      if (isFreshInsert && attendanceId && workdayForLateRule) {
        void handleLateArrivalAfterCheckIn({
          orgId: session.orgId,
          userId: session.user.id,
          userName: session.user.name ?? null,
          userEmail: session.user.email ?? null,
          date: today,
          checkIn: checkInAt,
          attendanceId,
        }).catch(() => {});
      }

      return ok({ success: true, isHolidayWork: !!holiday, isSundayWork: isSunday && !holiday });
    } catch (e) {
      return userErrorOr500(e, { route: "hr/attendance/check-in", orgId: session.orgId }, "Check-in failed.");
    }
  }, req);
}
