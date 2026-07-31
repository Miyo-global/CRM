import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateSlaTracking } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const records = await db.query.candidateSlaTracking.findMany({
      where: eq(candidateSlaTracking.orgId, session.orgId),
      orderBy: (t, { desc }) => [desc(t.enteredAt)],
    });

    type MonthKey = string;
    type StageKey = string;

    const grouped: Record<MonthKey, Record<StageKey, { total: number; breached: number }>> = {};

    for (const record of records) {
      const month = record.enteredAt.toISOString().slice(0, 7);
      if (!grouped[month]) grouped[month] = {};
      if (!grouped[month][record.stage]) grouped[month][record.stage] = { total: 0, breached: 0 };
      grouped[month][record.stage].total++;
      if (record.status === "BREACHED") {
        grouped[month][record.stage].breached++;
      }
    }

    const now = new Date();
    const months: MonthKey[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    const allStages = Array.from(
      new Set(Object.values(grouped).flatMap((m) => Object.keys(m)))
    ).sort();

    const report = months.map((month) => {
      const stageData = allStages.map((stage) => {
        const data = grouped[month]?.[stage] ?? { total: 0, breached: 0 };
        const breachPct = data.total > 0 ? Math.round((data.breached / data.total) * 100) : 0;
        return { stage, total: data.total, breached: data.breached, breachPct };
      });
      const totalAll = stageData.reduce((s, d) => s + d.total, 0);
      const breachedAll = stageData.reduce((s, d) => s + d.breached, 0);
      return {
        month,
        label: new Date(month + "-01").toLocaleString("en-US", { month: "short", year: "numeric" }),
        stages: stageData,
        overall: {
          total: totalAll,
          breached: breachedAll,
          breachPct: totalAll > 0 ? Math.round((breachedAll / totalAll) * 100) : 0,
        },
      };
    });

    const stageSummary = allStages.map((stage) => {
      const monthsWithData = report.filter((r) => {
        const s = r.stages.find((st) => st.stage === stage);
        return s && s.total > 0;
      });
      const avgBreachPct =
        monthsWithData.length > 0
          ? Math.round(
              monthsWithData.reduce((sum, r) => {
                const s = r.stages.find((st) => st.stage === stage)!;
                return sum + s.breachPct;
              }, 0) / monthsWithData.length
            )
          : 0;
      const totalBreached = report.reduce((sum, r) => {
        const s = r.stages.find((st) => st.stage === stage);
        return sum + (s?.breached ?? 0);
      }, 0);
      const totalAll = report.reduce((sum, r) => {
        const s = r.stages.find((st) => st.stage === stage);
        return sum + (s?.total ?? 0);
      }, 0);
      return { stage, avgBreachPct, totalBreached, totalAll };
    });

    return ok({ report, stages: allStages, stageSummary });
  });
}
