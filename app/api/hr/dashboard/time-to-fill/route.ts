import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/hr-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const data = await cached(
      `hr:dashboard:time-to-fill:${orgId}`,
      async () => {
        const filledJobs = await db
          .select({
            departmentId: jobPostings.departmentId,
            createdAt: jobPostings.createdAt,
            updatedAt: jobPostings.updatedAt,
          })
          .from(jobPostings)
          .where(
            and(
              eq(jobPostings.orgId, orgId),
              eq(jobPostings.status, "FILLED"),
              isNotNull(jobPostings.updatedAt),
            ),
          );

        if (!filledJobs.length) {
          return { avgDaysOverall: null, byDepartment: [] };
        }

        let totalDays = 0;
        const deptMap: Record<string, { total: number; count: number }> = {};

        for (const job of filledJobs) {
          if (!job.createdAt || !job.updatedAt) continue;
          const days = Math.max(
            0,
            Math.round(
              (new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          totalDays += days;

          const deptKey = job.departmentId != null ? String(job.departmentId) : "unknown";
          if (!deptMap[deptKey]) deptMap[deptKey] = { total: 0, count: 0 };
          deptMap[deptKey].total += days;
          deptMap[deptKey].count++;
        }

        const avgDaysOverall = Math.round(totalDays / filledJobs.length);

        const deptIds = Object.keys(deptMap)
          .filter((k) => k !== "unknown")
          .map(Number);

        let deptNames: Record<number, string> = {};
        if (deptIds.length > 0) {
          const { departments } = await import("@/lib/db/schema");
          const rows = await db
            .select({ id: departments.id, name: departments.name })
            .from(departments)
            .where(sql`${departments.id} = ANY(ARRAY[${sql.join(deptIds.map((id) => sql`${id}`), sql`, `)}])`);
          deptNames = Object.fromEntries(rows.map((r) => [r.id, r.name]));
        }

        const byDepartment = Object.entries(deptMap).map(([deptId, { total, count }]) => ({
          department:
            deptId === "unknown"
              ? "No Department"
              : (deptNames[Number(deptId)] ?? `Dept ${deptId}`),
          avgDays: Math.round(total / count),
          filledCount: count,
        }));

        byDepartment.sort((a, b) => b.avgDays - a.avgDays);

        return { avgDaysOverall, byDepartment };
      },
      { ttlSeconds: CACHE_TTL.LONG },
    );

    return ok(data);
  });
}
