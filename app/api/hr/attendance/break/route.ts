import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";

export async function POST() {
  return withAuth(async (session) => {
    const today = getTodayString();

    try {
      return await db.transaction(async (tx) => {
        const rows = await tx
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
          .limit(1)
          .for("update");

        const log = rows[0];

        if (!log) return err("You must punch in before taking a break.", 400);

        const now = new Date();
        const breaks =
          (log.breaks as unknown as { start: string; end?: string }[]) || [];

        if (log.status === "PRESENT") {
          const newBreaks = [...breaks, { start: now.toISOString() }];
          await tx
            .update(attendance)
            .set({ status: "ON_BREAK", breaks: newBreaks })
            .where(eq(attendance.id, log.id));
        } else if (log.status === "ON_BREAK") {
          const lastBreak = breaks[breaks.length - 1];
          if (!lastBreak || lastBreak.end) {
            return err("No open break to end", 400);
          }
          lastBreak.end = now.toISOString();
          const start = new Date(lastBreak.start);
          const duration =
            (now.getTime() - start.getTime()) / (1000 * 60 * 60);
          const totalBreak = (Number(log.breakHours) || 0) + duration;
          await tx
            .update(attendance)
            .set({
              status: "PRESENT",
              breaks: breaks,
              breakHours: totalBreak.toFixed(2),
            })
            .where(eq(attendance.id, log.id));
        } else {
          return err("You must be checked in (not checked out) to toggle a break.", 400);
        }

        return ok({ success: true });
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Toggle break failed";
      return err(message, 400);
    }
  });
}
