import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { attendance } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const userId = req.nextUrl.searchParams.get("userId") || session.user.id;

    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";
    if (userId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' attendance.", 403);
    }

    const yearParam = req.nextUrl.searchParams.get("year");
    const year =
      yearParam === null ? new Date().getFullYear() : Number(yearParam);
    if (!Number.isInteger(year) || year < 2000 || year > 9999) {
      return err("year must be a valid 4-digit year.", 400);
    }

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const dailyData = await db
      .select({
        date: attendance.date,
        totalHours: sql<string>`COALESCE(SUM(${attendance.workHours}::numeric), 0)`,
        sessions: sql<number>`count(*)`,
      })
      .from(attendance)
      .where(and(
        eq(attendance.orgId, session.orgId),
        eq(attendance.userId, userId),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      ))
      .groupBy(attendance.date)
      .orderBy(attendance.date);

    const heatmap = dailyData.map((d) => ({
      date: d.date,
      hours: Number(Number(d.totalHours).toFixed(1)),
      sessions: Number(d.sessions),
      intensity: Math.min(4, Math.floor(Number(d.totalHours) / 2)),
    }));

    const totalDays = heatmap.length;
    const totalHours = heatmap.reduce((s, d) => s + d.hours, 0);
    const avgHours = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : "0.0";
    const longestStreak = calculateStreak(heatmap.map((d) => d.date));

    return ok({
      year,
      userId,
      heatmap,
      summary: {
        totalDays,
        totalHours: totalHours.toFixed(1),
        avgHoursPerDay: avgHours,
        longestStreak,
      },
    });
  });
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  let maxStreak = 1;
  let currentStreak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = Date.UTC(
      Number(dates[i - 1].slice(0, 4)),
      Number(dates[i - 1].slice(5, 7)) - 1,
      Number(dates[i - 1].slice(8, 10))
    );
    const curr = Date.UTC(
      Number(dates[i].slice(0, 4)),
      Number(dates[i].slice(5, 7)) - 1,
      Number(dates[i].slice(8, 10))
    );
    const diffDays = (curr - prev) / 86400000;
    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  return maxStreak;
}
