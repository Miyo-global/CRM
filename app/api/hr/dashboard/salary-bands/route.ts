import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { salaryStructures, departmentMembers, departments } from "@/lib/db/schema";
import { eq, and, avg, min, max, count, sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

const SALARY_BANDS = [
  { label: "< 3L", min: 0, max: 300_000 },
  { label: "3–6L", min: 300_000, max: 600_000 },
  { label: "6–10L", min: 600_000, max: 1_000_000 },
  { label: "10–15L", min: 1_000_000, max: 1_500_000 },
  { label: "15–25L", min: 1_500_000, max: 2_500_000 },
  { label: "> 25L", min: 2_500_000, max: Infinity },
];

export const dynamic = "force-dynamic";


export async function GET() {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!["CEO", "ADMIN", "HR", "BRANCH_HR"].includes(role)) {
      return err("Forbidden", 403);
    }

    const cacheKey = `hr:salary-bands:${session.orgId}`;
    const data = await cached(cacheKey, async () => {
      const rows = await db
        .select({
          departmentName: departments.name,
          avgBasic: avg(salaryStructures.basicSalary).mapWith(Number),
          minBasic: min(salaryStructures.basicSalary).mapWith(Number),
          maxBasic: max(salaryStructures.basicSalary).mapWith(Number),
          employeeCount: count(salaryStructures.userId),
        })
        .from(salaryStructures)
        .innerJoin(departmentMembers, eq(departmentMembers.userId, salaryStructures.userId))
        .innerJoin(departments, eq(departments.id, departmentMembers.departmentId))
        .where(eq(salaryStructures.orgId, session.orgId))
        .groupBy(departments.name);

      const allSalaries = await db
        .select({ basicSalary: salaryStructures.basicSalary })
        .from(salaryStructures)
        .where(eq(salaryStructures.orgId, session.orgId));

      const annualSalaries = allSalaries.map((r) => Number(r.basicSalary) * 12);

      const bandDistribution = SALARY_BANDS.map((band) => ({
        label: band.label,
        count: annualSalaries.filter(
          (s) => s >= band.min && (band.max === Infinity ? true : s < band.max),
        ).length,
      }));

      return {
        byDepartment: rows.map((r) => ({
          department: r.departmentName,
          avgAnnual: Math.round((r.avgBasic ?? 0) * 12),
          minAnnual: Math.round((r.minBasic ?? 0) * 12),
          maxAnnual: Math.round((r.maxBasic ?? 0) * 12),
          employeeCount: r.employeeCount,
        })),
        bandDistribution,
      };
    });

    return ok(data);
  });
}
