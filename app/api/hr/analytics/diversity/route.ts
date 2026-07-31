import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and, sql, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    const members = await db
      .select({
        gender: users.gender,
        dateOfBirth: users.dateOfBirth,
        joiningDate: users.joiningDate,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(eq(organizationMembers.orgId, session.orgId), eq(users.isActive, true)));

    const genderMap: Record<string, number> = { MALE: 0, FEMALE: 0, OTHER: 0, Unknown: 0 };
    const ageBuckets: Record<string, number> = { "<25": 0, "25–34": 0, "35–44": 0, "45+": 0, Unknown: 0 };
    const tenureBuckets: Record<string, number> = { "<1yr": 0, "1–2yr": 0, "2–5yr": 0, "5+yr": 0, Unknown: 0 };

    const now = new Date();

    for (const m of members) {
      genderMap[m.gender ?? "Unknown"] = (genderMap[m.gender ?? "Unknown"] ?? 0) + 1;

      if (m.dateOfBirth) {
        const dob = new Date(m.dateOfBirth);
        const age = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (age < 25) ageBuckets["<25"]++;
        else if (age < 35) ageBuckets["25–34"]++;
        else if (age < 45) ageBuckets["35–44"]++;
        else ageBuckets["45+"]++;
      } else {
        ageBuckets["Unknown"]++;
      }

      if (m.joiningDate) {
        const jd = new Date(m.joiningDate);
        const tenureYears = (now.getTime() - jd.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (tenureYears < 1) tenureBuckets["<1yr"]++;
        else if (tenureYears < 2) tenureBuckets["1–2yr"]++;
        else if (tenureYears < 5) tenureBuckets["2–5yr"]++;
        else tenureBuckets["5+yr"]++;
      } else {
        tenureBuckets["Unknown"]++;
      }
    }

    const total = members.length;

    return ok({
      total,
      gender: Object.entries(genderMap)
        .filter(([, v]) => v > 0)
        .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 })),
      ageBuckets: Object.entries(ageBuckets)
        .filter(([, v]) => v > 0)
        .map(([label, count]) => ({ label, count })),
      tenureBuckets: Object.entries(tenureBuckets)
        .filter(([, v]) => v > 0)
        .map(([label, count]) => ({ label, count })),
    });
  });
}
