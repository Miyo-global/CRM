import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance, holidays } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { parseAttendancePunchBody, resolvePunchDate } from "@/lib/validations/attendance";
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
    const today = resolvePunchDate(body.localDate);

    const todayDate = new Date(today + "T00:00:00");
    const isSunday = todayDate.getDay() === 0;

    try {
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
      const message = e instanceof Error ? e.message : "Check-in failed";
      return err(message, 400);
    }
  });
}
