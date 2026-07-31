import { type NextRequest } from "next/server";
import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const { searchParams } = new URL(req.url);
    const repId = searchParams.get("repId");

    const cacheKey = `sales:cycle-length:${session.orgId}:${repId ?? "all"}`;

    const data = await cached(
      cacheKey,
      async () => {
        const conditions = [
          eq(deals.orgId, session.orgId),
          eq(deals.stage, "WON"),
          isNotNull(deals.actualCloseDate),
          isNotNull(deals.createdAt),
        ];

        if (repId) conditions.push(eq(deals.assignedToId, repId));

        const wonDeals = await db
          .select({
            createdAt: deals.createdAt,
            actualCloseDate: deals.actualCloseDate,
            value: deals.value,
          })
          .from(deals)
          .where(and(...conditions));

        if (!wonDeals.length) {
          return {
            avgDays: null,
            medianDays: null,
            histogram: [],
            totalDeals: 0,
          };
        }

        const daysList: number[] = wonDeals
          .map((d) => {
            if (!d.createdAt || !d.actualCloseDate) return null;
            const diff = Math.max(
              0,
              Math.round(
                (new Date(d.actualCloseDate).getTime() - new Date(d.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            );
            return diff;
          })
          .filter((d): d is number => d !== null);

        const sorted = [...daysList].sort((a, b) => a - b);
        const avg = Math.round(daysList.reduce((s, d) => s + d, 0) / daysList.length);
        const median =
          sorted.length % 2 === 0
            ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
            : sorted[Math.floor(sorted.length / 2)];

        const buckets = [
          { label: "0–7d", min: 0, max: 7, count: 0 },
          { label: "8–14d", min: 8, max: 14, count: 0 },
          { label: "15–30d", min: 15, max: 30, count: 0 },
          { label: "31–60d", min: 31, max: 60, count: 0 },
          { label: "61–90d", min: 61, max: 90, count: 0 },
          { label: "90d+", min: 91, max: Infinity, count: 0 },
        ];

        for (const days of daysList) {
          const bucket = buckets.find((b) => days >= b.min && days <= b.max);
          if (bucket) bucket.count++;
        }

        return {
          avgDays: avg,
          medianDays: median,
          minDays: sorted[0],
          maxDays: sorted[sorted.length - 1],
          histogram: buckets.map(({ label, count }) => ({ label, count })),
          totalDeals: daysList.length,
        };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
