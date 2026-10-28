import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import {
  countDepartmentReferences,
  departmentNameTaken,
  isOrgMember,
} from "@/server/queries/hr/department-membership";
import { z } from "zod";

const patchDepartmentSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  // null clears the head.
  managerId: z.string().min(1).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> },
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admins and Owners can edit departments.", 403);
    }
    const departmentId = parseInt((await params).departmentId, 10);
    if (Number.isNaN(departmentId)) return err("Invalid department ID.", 400);

    const body = await parseBody(req, patchDepartmentSchema);
    const existing = await db.query.departments.findFirst({
      where: and(eq(departments.id, departmentId), eq(departments.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!existing) return err("Department not found.", 404);

    if (body.name && (await departmentNameTaken(session.orgId, body.name, departmentId))) {
      return err("A department with this name already exists.", 409);
    }
    if (body.managerId && !(await isOrgMember(session.orgId, body.managerId))) {
      return err("Department head must be a member of this organization.", 400);
    }

    await db
      .update(departments)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.managerId !== undefined && { managerId: body.managerId }),
      })
      .where(and(eq(departments.id, departmentId), eq(departments.orgId, session.orgId)));

    return ok({ success: true });
  });
}

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
