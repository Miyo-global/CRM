import { withAuth, ok } from "@/lib/api/helpers";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const STAGE_PROBABILITIES: Record<string, number> = {
  LEAD: 10,
  CONTACTED: 30,
  PROPOSAL: 50,
  NEGOTIATION: 70,
  WON: 100,
  LOST: 0,
};

interface ForecastMonth {
  month: string;
  label: string;
  weighted: number;
  bestCase: number;
  dealCount: number;
}

interface ForecastSummary {
  totalWeighted: number;
  totalBestCase: number;
  totalDeals: number;
  byMonth: ForecastMonth[];
  byStage: Array<{
    stage: string;
    count: number;
    totalValue: number;
    weightedValue: number;
    avgProbability: number;
  }>;
}

export async function GET() {
  return withAuth(async (session) => {
    const summary = await cached(
      CACHE_KEYS.dealsForecast(session.orgId),
      () => buildForecast(session.orgId),
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );
    return ok(summary);
  });
}

async function buildForecast(orgId: string): Promise<ForecastSummary> {
    const allDeals = await db
      .select()
      .from(deals)
      .where(
        and(
          eq(deals.orgId, orgId),
          notInArray(deals.stage, ["WON", "LOST"]),
        ),
      );

    const monthMap = new Map<string, ForecastMonth>();
    const stageMap = new Map<string, { count: number; totalValue: number; weightedValue: number; probSum: number }>();

    for (const deal of allDeals) {
      const value = Number(deal.value ?? 0);
      const probability = deal.probability || STAGE_PROBABILITIES[deal.stage] || 20;
      const weighted = Math.round(value * probability / 100);

      const closeDate = deal.expectedCloseDate
        ? new Date(deal.expectedCloseDate)
        : deal.createdAt
          ? new Date(new Date(deal.createdAt).getTime() + 90 * 24 * 60 * 60 * 1000)
          : new Date();

      const monthKey = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = closeDate.toLocaleDateString(DEFAULT_LOCALE, { month: "short", year: "numeric" });

      const existing = monthMap.get(monthKey) ?? { month: monthKey, label: monthLabel, weighted: 0, bestCase: 0, dealCount: 0 };
      existing.weighted += weighted;
      existing.bestCase += value;
      existing.dealCount += 1;
      monthMap.set(monthKey, existing);

      const stageData = stageMap.get(deal.stage) ?? { count: 0, totalValue: 0, weightedValue: 0, probSum: 0 };
      stageData.count += 1;
      stageData.totalValue += value;
      stageData.weightedValue += weighted;
      stageData.probSum += probability;
      stageMap.set(deal.stage, stageData);
    }

    const byMonth = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));
    const byStage = [...stageMap.entries()].map(([stage, data]) => ({
      stage,
      count: data.count,
      totalValue: data.totalValue,
      weightedValue: data.weightedValue,
      avgProbability: data.count > 0 ? Math.round(data.probSum / data.count) : 0,
    }));

    return {
      totalWeighted: byMonth.reduce((sum, m) => sum + m.weighted, 0),
      totalBestCase: byMonth.reduce((sum, m) => sum + m.bestCase, 0),
      totalDeals: allDeals.length,
      byMonth,
      byStage,
    };
}
