"server-only";

import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, asc } from "drizzle-orm";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import type { AttendanceLog, AttendanceStatusResult } from "@/types/hr";

export async function getAttendanceStatus(
  orgId: string,
  userId: string
): Promise<AttendanceStatusResult> {
  const today = getTodayString();
  const now = new Date();

  const todayLogs = await db.query.attendance.findMany({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.date, today),
      eq(attendance.orgId, orgId)
    ),
  });

  let dailyWorkHours = 0;
  let dailyBreakHours = 0;
  let isDailyOvertime = false;

  for (const log of todayLogs) {
    dailyBreakHours += Number(log.breakHours || 0);

    if (!log.checkOut && log.checkIn) {
      const start = new Date(log.checkIn);
      const durationMs = now.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const netWork = durationHours - (Number(log.breakHours) || 0);
      dailyWorkHours += Math.max(0, netWork);
    } else {
      const rawWork = Number(log.workHours || 0);
      const breakHrs = Number(log.breakHours || 0);
      dailyWorkHours += Math.max(0, rawWork - breakHrs);
    }

    if (log.isOvertime) isDailyOvertime = true;
  }

  const todayLog = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.date, today),
      eq(attendance.orgId, orgId)
    ),
    orderBy: [desc(attendance.createdAt)],
  });

  let status: "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT" = "OFFLINE";
  if (todayLog) {
    if (todayLog.checkOut) status = "CHECKED_OUT";
    else if (todayLog.status === "ON_BREAK") status = "ON_BREAK";
    else status = "PRESENT";
  }

  const logs = await db.query.attendance.findMany({
    where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
    orderBy: [desc(attendance.createdAt)],
    limit: 10,
  });

  let cooldownRemaining = 0;
  if (status === "CHECKED_OUT" && todayLog?.checkOut) {
    const lastCheckOut = new Date(todayLog.checkOut);
    const diffMs = now.getTime() - lastCheckOut.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    if (diffMinutes < 2) {
      cooldownRemaining = Math.ceil((2 * 60 * 1000 - diffMs) / 1000);
    }
  }

  const punchBlockedReason = null;

  return {
    status,
    logs: logs as unknown as AttendanceLog[],
    todayLog: todayLog as unknown as AttendanceLog | null,
    dailyStats: {
      workHours: dailyWorkHours.toFixed(2),
      breakHours: dailyBreakHours.toFixed(2),
      isOvertime: isDailyOvertime,
    },
    cooldownRemaining,
    punchBlockedReason,
  };
}

export async function getAttendanceLogs(
  orgId: string,
  userId: string,
  year?: number,
  month?: number
): Promise<AttendanceLog[]> {
  if (year !== undefined && month !== undefined) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, userId),
        eq(attendance.orgId, orgId),
        gte(attendance.date, formatDateOnly(startDate)),
        lte(attendance.date, formatDateOnly(endDate))
      ),
      orderBy: [asc(attendance.date)],
    }) as unknown as Promise<AttendanceLog[]>;
  }

  return db.query.attendance.findMany({
    where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
    orderBy: [desc(attendance.createdAt)],
    limit: 30,
  }) as unknown as Promise<AttendanceLog[]>;
}

export async function getMonthlyAttendance(
  orgId: string,
  userId: string,
  year: number,
  month: number
): Promise<AttendanceLog[]> {
  const mm = String(month + 1).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  return db.query.attendance.findMany({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.orgId, orgId),
      gte(attendance.date, startDate),
      lte(attendance.date, endDate)
    ),
    orderBy: [asc(attendance.date)],
  }) as unknown as Promise<AttendanceLog[]>;
}
