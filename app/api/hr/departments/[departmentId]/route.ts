import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { countDepartmentReferences } from "@/server/queries/hr/department-membership";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> },
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admins and Owners can delete departments.", 403);
    }

    const { departmentId: departmentIdParam } = await params;
    const departmentId = parseInt(departmentIdParam, 10);
    if (Number.isNaN(departmentId)) {
      return err("Invalid department ID.", 400);
    }

    const [existing] = await db
      .select({ id: departments.id, orgId: departments.orgId })
      .from(departments)
      .where(eq(departments.id, departmentId))
      .limit(1);

    if (!existing) return err("Department not found.", 404);
    if (existing.orgId !== session.orgId) return err("Department not found.", 404);

    // Count references via BOTH department_members and users.departmentId (D17)
    // so we never orphan a directory user by deleting their department.
    const memberCount = await countDepartmentReferences(session.orgId, departmentId);

    if (memberCount > 0) {
      return err(
        `This department has ${memberCount} employee${memberCount !== 1 ? "s" : ""}. Reassign them before deleting.`,
        409,
      );
    }

    await db.delete(departments).where(and(eq(departments.id, departmentId), eq(departments.orgId, session.orgId)));

    return ok({ success: true });
  });
}
