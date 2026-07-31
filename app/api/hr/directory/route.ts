import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers, departments, departmentMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";


export async function GET() {
  return withAuth(async (session) => {
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        image: users.image,
        designation: users.designation,
        role: organizationMembers.role,
        phone: users.phone,
        reportingTo: users.reportingTo,
        departmentId: users.departmentId,
        employeeId: users.employeeId,
        isActive: users.isActive,
      })
      .from(users)
      .innerJoin(organizationMembers, and(
        eq(organizationMembers.userId, users.id),
        eq(organizationMembers.orgId, session.orgId),
      ))
      .where(eq(users.isActive, true));

    const depts = await db.query.departments.findMany({
      where: eq(departments.orgId, session.orgId),
      columns: { id: true, name: true, managerId: true },
    });

    const deptMemberships = depts.length > 0
      ? await db.query.departmentMembers.findMany({
          columns: { userId: true, departmentId: true },
        })
      : [];

    const deptById = new Map(depts.map((d) => [d.id, d]));
    const userDeptMap = new Map<string, number>();
    for (const dm of deptMemberships) {
      userDeptMap.set(dm.userId, dm.departmentId);
    }

    const directory = members.map((m) => {
      const deptId = m.departmentId ?? userDeptMap.get(m.id) ?? null;
      const dept = deptId ? deptById.get(deptId) : null;
      return {
        id: m.id,
        name: (m.name ?? [m.firstName, m.lastName].filter(Boolean).join(" ")) || m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        image: m.image,
        designation: m.designation,
        role: m.role,
        phone: m.phone,
        reportingTo: m.reportingTo,
        employeeId: m.employeeId,
        department: dept ? { id: dept.id, name: dept.name } : null,
      };
    });

    return ok(directory);
  });
}
