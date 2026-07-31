import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { departments } from "@/lib/db/schema/hr";
import { eq, and } from "drizzle-orm";

export interface TeamMember {
  id: string;
  name: string | null;
  image: string | null;
  designation: string | null;
  email: string;
  role: string;
}

export interface TeamDetail {
  id: number;
  name: string;
  managerId: string | null;
  managerName: string | null;
  members: TeamMember[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  return withAuth<TeamDetail>(async (session) => {
    const { teamId } = await params;
    const deptId = parseInt(teamId, 10);
    if (isNaN(deptId)) return err("Invalid team ID", 400);

    const dept = await db.query.departments.findFirst({
      where: and(
        eq(departments.id, deptId),
        eq(departments.orgId, session.orgId),
      ),
    });
    if (!dept) return err("Team not found", 404);

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        designation: users.designation,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          eq(users.departmentId, deptId),
          eq(users.isActive, true),
        ),
      );

    let managerName: string | null = null;
    if (dept.managerId) {
      const mgr = await db.query.users.findFirst({
        where: eq(users.id, dept.managerId),
        columns: { name: true },
      });
      managerName = mgr?.name ?? null;
    }

    return ok({
      id: dept.id,
      name: dept.name,
      managerId: dept.managerId,
      managerName,
      members,
    });
  });
}
