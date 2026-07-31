import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { interviewScorecards, interviews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { interviewId: idParam } = await params;
    const interviewId = Number(idParam);
    if (!interviewId) return err("Invalid interview ID.", 400);

    const interview = await db.query.interviews.findFirst({
      where: and(eq(interviews.id, interviewId), eq(interviews.orgId, session.orgId)),
    });
    if (!interview) return err("Interview not found.", 404);

    const scorecards = await db.query.interviewScorecards.findMany({
      where: eq(interviewScorecards.interviewId, interviewId),
    });

    const submittedScorecards = scorecards.filter((sc) => sc.submittedAt !== null);

    const aggregated: Record<string, { total: number; count: number; average: number }> = {};
    for (const sc of submittedScorecards) {
      for (const [key, value] of Object.entries(sc.ratings)) {
        if (!aggregated[key]) {
          aggregated[key] = { total: 0, count: 0, average: 0 };
        }
        aggregated[key].total += value;
        aggregated[key].count += 1;
      }
    }
    for (const key of Object.keys(aggregated)) {
      const entry = aggregated[key];
      entry.average = entry.count > 0 ? entry.total / entry.count : 0;
    }

    const recommendationCounts = submittedScorecards.reduce<Record<string, number>>(
      (acc, sc) => {
        const rec = sc.recommendation;
        acc[rec] = (acc[rec] ?? 0) + 1;
        return acc;
      },
      {}
    );

    return ok({
      interviewId,
      totalScorecards: scorecards.length,
      submittedCount: submittedScorecards.length,
      scorecards: submittedScorecards,
      aggregatedRatings: aggregated,
      recommendationCounts,
    });
  });
}
