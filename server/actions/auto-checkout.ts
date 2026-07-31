"use server";

import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, isNull, lte } from "drizzle-orm";
import { istSevenPmUtcForDateStr, DEFAULT_AUTO_CHECKOUT_BREAK_HOURS } from "@/lib/attendance-auto-checkout";
import { getTodayIST } from "@/lib/careers/application-deadline";

export async function processAutoCheckout() {
  const openRecords = await db.query.attendance.findMany({
    where: and(isNull(attendance.checkOut), lte(attendance.date, getTodayIST())),
  });

  if (openRecords.length === 0) {
    return { processed: 0, message: "No open attendance records found" };
  }

  let processed = 0;
  const now = Date.now();

  for (const record of openRecords) {
    if (!record.checkIn || record.autoCheckedOut || !record.date) continue;

    const checkInTime = new Date(record.checkIn);
    const checkOutTime = istSevenPmUtcForDateStr(record.date);

    if (checkOutTime.getTime() > now) continue;

    if (checkInTime >= checkOutTime) {
      const closed = await db
        .update(attendance)
        .set({
          checkOut: checkInTime,
          workHours: "0.00",
          status: "PRESENT",
          autoCheckedOut: true,
        })
        .where(and(eq(attendance.id, record.id), isNull(attendance.checkOut)))
        .returning({ id: attendance.id });
      if (closed.length > 0) processed++;
      continue;
    }

    const breaks = (record.breaks as { start: string; end?: string }[]) || [];
    let totalBreakHours = Number(record.breakHours) || 0;

    for (const b of breaks) {
      if (!b.end) {
        b.end = checkOutTime.toISOString();
        const breakStart = new Date(b.start);
        const breakDuration = (checkOutTime.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
        totalBreakHours += Math.max(0, breakDuration);
      }
    }

    const effectiveBreakHours = Math.max(totalBreakHours, DEFAULT_AUTO_CHECKOUT_BREAK_HOURS);
    const durationMs = checkOutTime.getTime() - checkInTime.getTime();
    const workHours = Math.max(0, durationMs / (1000 * 60 * 60) - effectiveBreakHours);
    const isOvertime = workHours > 8;

    const result = await db
      .update(attendance)
      .set({
        checkOut: checkOutTime,
        workHours: workHours.toFixed(2),
        breakHours: effectiveBreakHours.toFixed(2),
        breaks: breaks,
        status: "PRESENT",
        autoCheckedOut: true,
        isOvertime,
      })
      .where(and(eq(attendance.id, record.id), isNull(attendance.checkOut)))
      .returning({ id: attendance.id });

    if (result.length > 0) processed++;
  }

  return {
    processed,
    message: `Auto-checked out ${processed} attendance records`,
  };
}
