import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users, departments } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  return withAdmin(async (session) => {
    const [overall, byDept, byRole] = await Promise.all([
      db.select({
        avgSalary: sql<string>`COALESCE(AVG(${users.monthlySalary}::numeric), 0)`,
        minSalary: sql<string>`COALESCE(MIN(${users.monthlySalary}::numeric), 0)`,
        maxSalary: sql<string>`COALESCE(MAX(${users.monthlySalary}::numeric), 0)`,
        medianSalary: sql<string>`COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${users.monthlySalary}::numeric), 0)`,
      })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(users.isActive, true))),

      db.select({
        departmentId: users.departmentId,
        avgSalary: sql<string>`COALESCE(AVG(${users.monthlySalary}::numeric), 0)`,
        count: sql<number>`count(*)`,
      })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(users.isActive, true)))
        .groupBy(users.departmentId),

      db.select({
        role: users.role,
        avgSalary: sql<string>`COALESCE(AVG(${users.monthlySalary}::numeric), 0)`,
        count: sql<number>`count(*)`,
      })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(users.isActive, true)))
        .groupBy(users.role),
    ]);

    const allDepts = await db.query.departments.findMany({ where: eq(departments.orgId, session.orgId) });
    const deptMap = new Map(allDepts.map((d) => [d.id, d.name]));

    return ok({
      overall: {
        avgSalary: Number(overall[0]?.avgSalary ?? 0).toFixed(0),
        minSalary: Number(overall[0]?.minSalary ?? 0).toFixed(0),
        maxSalary: Number(overall[0]?.maxSalary ?? 0).toFixed(0),
        medianSalary: Number(overall[0]?.medianSalary ?? 0).toFixed(0),
      },
      byDepartment: byDept.map((d) => ({
        department: d.departmentId ? (deptMap.get(d.departmentId) ?? "Other") : "Unassigned",
        avgSalary: Number(d.avgSalary).toFixed(0),
        count: Number(d.count),
      })),
      byRole: byRole.map((r) => ({
        role: r.role,
        avgSalary: Number(r.avgSalary).toFixed(0),
        count: Number(r.count),
      })),
    });
  });
}
