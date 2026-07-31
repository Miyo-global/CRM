import { inngest } from "../client";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, isNull, lte } from "drizzle-orm";
import { subHours } from "date-fns";
import { istSevenPmUtcForDateStr, DEFAULT_AUTO_CHECKOUT_BREAK_HOURS } from "@/lib/attendance-auto-checkout";

export const autoCheckout = inngest.createFunction(
  { id: "auto-checkout", name: "Auto Checkout Stale Attendance", triggers: { cron: "0 * * * *" } },
  async ({ step }) => {
    const cutoffTime = subHours(new Date(), 14);

    const staleRecords = await step.run("find-stale-attendance", async () => {
      return db.query.attendance.findMany({
        where: and(
          isNull(attendance.checkOut),
          lte(attendance.checkIn, cutoffTime)
        ),
      });
    });

    if (staleRecords.length === 0) {
      return { checkedOut: 0 };
    }

    const results = await step.run("auto-checkout-records", async () => {
      let count = 0;
      const now = Date.now();

      for (const record of staleRecords) {
        if (!record.checkIn || !record.date) continue;

        const checkInTime = new Date(record.checkIn);
        const checkOutTime = istSevenPmUtcForDateStr(record.date);

        if (checkOutTime.getTime() > now) continue;

        if (checkInTime >= checkOutTime) {
          await db
            .update(attendance)
            .set({
              checkOut: checkOutTime,
              workHours: "0",
              autoCheckedOut: true,
              isOvertime: false,
            })
            .where(and(eq(attendance.id, record.id), isNull(attendance.checkOut)));
          count++;
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

        await db
          .update(attendance)
          .set({
            checkOut: checkOutTime,
            workHours: workHours.toFixed(2),
            breakHours: effectiveBreakHours.toFixed(2),
            breaks: breaks,
            autoCheckedOut: true,
            isOvertime,
          })
          .where(and(eq(attendance.id, record.id), isNull(attendance.checkOut)));

        count++;
      }

      return count;
    });

    return { checkedOut: results };
  }
);
