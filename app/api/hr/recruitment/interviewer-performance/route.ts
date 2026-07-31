import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { interviews, interviewScorecards, users } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { withAuth, ok } from "@/lib/api/helpers";
import { subDays } from "date-fns";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const url = new URL(req.url);
    const days = Math.min(Number(url.searchParams.get("days") ?? "90"), 365);
    const since = subDays(new Date(), days);

    const rows = await db
      .select({
        interviewerId: interviewScorecards.interviewerId,
        interviewerName: users.name,
        interviewerEmail: users.email,
        scorecardSubmittedAt: interviewScorecards.submittedAt,
        interviewScheduledAt: interviews.scheduledAt,
        recommendation: interviewScorecards.recommendation,
      })
      .from(interviewScorecards)
      .innerJoin(interviews, eq(interviewScorecards.interviewId, interviews.id))
      .innerJoin(users, eq(interviewScorecards.interviewerId, users.id))
      .where(
        and(
          eq(interviews.orgId, session.orgId),
          isNotNull(interviewScorecards.submittedAt),
          sql`${interviews.scheduledAt} >= ${since}`
        )
      );

    const map = new Map<
      string,
      {
        interviewerId: string;
        interviewerName: string | null;
        interviewerEmail: string | null;
        totalAssigned: number;
        submitted: number;
        totalHoursToSubmit: number;
        recommendations: Record<string, number>;
      }
    >();

    for (const row of rows) {
      const existing = map.get(row.interviewerId);
      const hoursToSubmit =
        row.scorecardSubmittedAt && row.interviewScheduledAt
          ? (new Date(row.scorecardSubmittedAt).getTime() -
              new Date(row.interviewScheduledAt).getTime()) /
            (1000 * 60 * 60)
          : null;

      if (!existing) {
        map.set(row.interviewerId, {
          interviewerId: row.interviewerId,
          interviewerName: row.interviewerName,
          interviewerEmail: row.interviewerEmail,
          totalAssigned: 1,
          submitted: 1,
          totalHoursToSubmit: hoursToSubmit != null && hoursToSubmit >= 0 ? hoursToSubmit : 0,
          recommendations: { [row.recommendation]: 1 },
        });
      } else {
        existing.totalAssigned += 1;
        existing.submitted += 1;
        if (hoursToSubmit != null && hoursToSubmit >= 0) {
          existing.totalHoursToSubmit += hoursToSubmit;
        }
        existing.recommendations[row.recommendation] =
          (existing.recommendations[row.recommendation] ?? 0) + 1;
      }
    }

    const assignedRows = await db
      .select({
        interviewerId: interviews.interviewerId,
        count: sql<number>`count(*)::int`,
      })
      .from(interviews)
      .where(
        and(
          eq(interviews.orgId, session.orgId),
          isNotNull(interviews.interviewerId),
          sql`${interviews.scheduledAt} >= ${since}`
        )
      )
      .groupBy(interviews.interviewerId);

    const assignedMap = new Map<string, number>();
    for (const r of assignedRows) {
      if (r.interviewerId) assignedMap.set(r.interviewerId, r.count);
    }

    const stats = Array.from(map.values()).map((item) => ({
      interviewerId: item.interviewerId,
      interviewerName: item.interviewerName,
      interviewerEmail: item.interviewerEmail,
      totalAssigned: assignedMap.get(item.interviewerId) ?? item.totalAssigned,
      submitted: item.submitted,
      pending: Math.max(0, (assignedMap.get(item.interviewerId) ?? item.totalAssigned) - item.submitted),
      avgHoursToSubmit:
        item.submitted > 0
          ? Math.round((item.totalHoursToSubmit / item.submitted) * 10) / 10
          : null,
      recommendations: item.recommendations,
    }));

    stats.sort((a, b) => {
      if (a.avgHoursToSubmit === null && b.avgHoursToSubmit === null) return 0;
      if (a.avgHoursToSubmit === null) return 1;
      if (b.avgHoursToSubmit === null) return -1;
      return a.avgHoursToSubmit - b.avgHoursToSubmit;
    });

    return ok({ stats, period: { days, since: since.toISOString() } });
  });
}
