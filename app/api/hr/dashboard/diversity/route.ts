import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/hr-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const data = await cached(
      `hr:dashboard:diversity:${orgId}`,
      async () => {
        const genderRows = await db
          .select({
            gender: users.gender,
            count: count(),
          })
          .from(organizationMembers)
          .innerJoin(users, eq(organizationMembers.userId, users.id))
          .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
          .groupBy(users.gender);

        const genderBreakdown = genderRows.map((r) => ({
          gender: r.gender ?? "NOT_SPECIFIED",
          count: Number(r.count),
        }));

        const membersForAge = await db
          .select({ dateOfBirth: users.dateOfBirth })
          .from(organizationMembers)
          .innerJoin(users, eq(organizationMembers.userId, users.id))
          .where(
            and(
              eq(organizationMembers.orgId, orgId),
              eq(users.isActive, true),
              sql`${users.dateOfBirth} IS NOT NULL`,
            ),
          );

        const ageBuckets: Record<string, number> = {
          "Under 25": 0,
          "25–34": 0,
          "35–44": 0,
          "45–54": 0,
          "55+": 0,
        };

        const now = new Date();
        for (const m of membersForAge) {
          if (!m.dateOfBirth) continue;
          const dob = new Date(m.dateOfBirth);
          const age = now.getFullYear() - dob.getFullYear() -
            (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
          if (age < 25) ageBuckets["Under 25"]++;
          else if (age < 35) ageBuckets["25–34"]++;
          else if (age < 45) ageBuckets["35–44"]++;
          else if (age < 55) ageBuckets["45–54"]++;
          else ageBuckets["55+"]++;
        }

        const ageDistribution = Object.entries(ageBuckets).map(([range, count]) => ({
          range,
          count,
        }));

        return { genderBreakdown, ageDistribution };
      },
      { ttlSeconds: CACHE_TTL.LONG },
    );

    return ok(data);
  });
}
