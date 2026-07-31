import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/hr-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const data = await cached(
      `hr:dashboard:headcount-trends:${orgId}`,
      async () => {
        const now = new Date();

        const months: { label: string; start: string; end: string }[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const start = d.toISOString().slice(0, 10);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
            .toISOString()
            .slice(0, 10);
          const label = d.toLocaleString("en-US", {
            month: "short",
            year: "2-digit",
          });
          months.push({ label, start, end });
        }

        const results = await Promise.all(
          months.map(async ({ label, end }) => {
            const [row] = await db
              .select({ count: sql<number>`count(*)` })
              .from(organizationMembers)
              .innerJoin(users, eq(organizationMembers.userId, users.id))
              .where(
                and(
                  eq(organizationMembers.orgId, orgId),
                  lte(users.joiningDate, end),
                ),
              );
            return { month: label, count: Number(row?.count ?? 0) };
          }),
        );

        return { trends: results };
      },
      { ttlSeconds: CACHE_TTL.LONG },
    );

    return ok(data);
  });
}
