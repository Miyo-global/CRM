import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { leadActivities, dealActivities, users } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  period: z.enum(["week", "month"]).default("week"),
});

export interface RepActivity {
  userId: string;
  name: string | null;
  role: string | null;
  calls: number;
  emails: number;
  meetings: number;
  whatsapp: number;
  other: number;
  total: number;
  dealActivities: number;
}

export interface ActivityDashboardResponse {
  period: "week" | "month";
  startDate: string;
  endDate: string;
  reps: RepActivity[];
  totals: Omit<RepActivity, "userId" | "name" | "role">;
  trend: { date: string; count: number }[];
}


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { period } = parseQuery(req, querySchema);

    const data = await cached(
      `sales:activity:${session.orgId}:${period}`,
      async () => {
        const now = new Date();
        const days = period === "week" ? 7 : 30;
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);

        const leadRows = await db
          .select({
            userId: leadActivities.userId,
            type: leadActivities.type,
            date: leadActivities.date,
            userName: users.name,
            userRole: users.role,
          })
          .from(leadActivities)
          .leftJoin(users, eq(leadActivities.userId, users.id))
          .where(
            and(
              eq(leadActivities.orgId, session.orgId),
              gte(leadActivities.date, startDate),
              lte(leadActivities.date, endDate),
            ),
          );

        const dealRows = await db
          .select({
            userId: dealActivities.userId,
            createdAt: dealActivities.createdAt,
          })
          .from(dealActivities)
          .where(
            and(
              eq(dealActivities.orgId, session.orgId),
              gte(dealActivities.createdAt, startDate),
              lte(dealActivities.createdAt, endDate),
            ),
          );

        const repMap = new Map<string, RepActivity>();

        for (const row of leadRows) {
          if (!repMap.has(row.userId)) {
            repMap.set(row.userId, {
              userId: row.userId,
              name: row.userName ?? null,
              role: row.userRole ?? null,
              calls: 0,
              emails: 0,
              meetings: 0,
              whatsapp: 0,
              other: 0,
              total: 0,
              dealActivities: 0,
            });
          }
          const rep = repMap.get(row.userId)!;
          switch (row.type) {
            case "call":
              rep.calls++;
              break;
            case "email":
              rep.emails++;
              break;
            case "meeting":
              rep.meetings++;
              break;
            case "whatsapp":
              rep.whatsapp++;
              break;
            default:
              rep.other++;
          }
          rep.total++;
        }

        const missingUserIds = Array.from(
          new Set(dealRows.map((row) => row.userId).filter((id) => !repMap.has(id))),
        );
        const dealUserMap = new Map<string, { name: string | null; role: string | null }>();
        if (missingUserIds.length > 0) {
          const dealUsers = await db
            .select({ id: users.id, name: users.name, role: users.role })
            .from(users)
            .where(inArray(users.id, missingUserIds));
          for (const u of dealUsers) {
            dealUserMap.set(u.id, { name: u.name ?? null, role: u.role ?? null });
          }
        }

        for (const row of dealRows) {
          if (!repMap.has(row.userId)) {
            const userInfo = dealUserMap.get(row.userId);
            repMap.set(row.userId, {
              userId: row.userId,
              name: userInfo?.name ?? null,
              role: userInfo?.role ?? null,
              calls: 0,
              emails: 0,
              meetings: 0,
              whatsapp: 0,
              other: 0,
              total: 0,
              dealActivities: 0,
            });
          }
          repMap.get(row.userId)!.dealActivities++;
        }

        const reps = Array.from(repMap.values()).sort(
          (a, b) => b.total + b.dealActivities - (a.total + a.dealActivities),
        );

        const totals: Omit<RepActivity, "userId" | "name" | "role"> = {
          calls: 0,
          emails: 0,
          meetings: 0,
          whatsapp: 0,
          other: 0,
          total: 0,
          dealActivities: 0,
        };
        for (const rep of reps) {
          totals.calls += rep.calls;
          totals.emails += rep.emails;
          totals.meetings += rep.meetings;
          totals.whatsapp += rep.whatsapp;
          totals.other += rep.other;
          totals.total += rep.total;
          totals.dealActivities += rep.dealActivities;
        }

        const trendMap = new Map<string, number>();
        for (let d = 0; d < days; d++) {
          const day = new Date(startDate);
          day.setDate(startDate.getDate() + d);
          trendMap.set(day.toISOString().slice(0, 10), 0);
        }

        for (const row of leadRows) {
          const day = new Date(row.date).toISOString().slice(0, 10);
          if (trendMap.has(day)) {
            trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
          }
        }
        for (const row of dealRows) {
          if (!row.createdAt) continue;
          const day = new Date(row.createdAt).toISOString().slice(0, 10);
          if (trendMap.has(day)) {
            trendMap.set(day, (trendMap.get(day) ?? 0) + 1);
          }
        }

        const trend = Array.from(trendMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count }));

        return {
          period,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          reps,
          totals,
          trend,
        } satisfies ActivityDashboardResponse;
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
