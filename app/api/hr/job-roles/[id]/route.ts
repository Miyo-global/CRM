import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobRoles, departments } from "@/lib/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const JOB_ROLE_TITLE_MIN = 2;
const JOB_ROLE_TITLE_MAX = 120;

const titleSchema = z
  .string()
  .trim()
  .min(JOB_ROLE_TITLE_MIN, `Job role must be at least ${JOB_ROLE_TITLE_MIN} characters`)
  .max(JOB_ROLE_TITLE_MAX, `Job role must be at most ${JOB_ROLE_TITLE_MAX} characters`)
  .refine((v) => /[A-Za-z0-9]/.test(v), "Job role must contain at least one letter or number");

const updateSchema = z
  .object({
    title: titleSchema.optional(),
    departmentId: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) => d.title !== undefined || d.departmentId !== undefined || d.isActive !== undefined,
    { message: "No fields to update." },
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admins and Owners can edit job roles.", 403);
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return err("Invalid job role ID.", 400);

    const existing = await db.query.jobRoles.findFirst({
      where: and(eq(jobRoles.id, id), eq(jobRoles.orgId, session.orgId)),
    });
    if (!existing) return err("Job role not found.", 404);

    const body = await parseBody(req, updateSchema);

    const nextTitle = body.title !== undefined ? body.title.trim() : existing.title;
    const nextDepartmentId =
      body.departmentId !== undefined ? body.departmentId : existing.departmentId;

    if (body.departmentId !== undefined && body.departmentId !== null) {
      const dept = await db.query.departments.findFirst({
        where: and(eq(departments.id, body.departmentId), eq(departments.orgId, session.orgId)),
        columns: { id: true },
      });
      if (!dept) return err("Department not found.", 404);
    }

    // Guard the (org, scope, title) uniqueness on rename or department move.
    if (body.title !== undefined || body.departmentId !== undefined) {
      const scopeConditions = [eq(jobRoles.orgId, session.orgId), ne(jobRoles.id, id)];
      scopeConditions.push(
        nextDepartmentId === null
          ? isNull(jobRoles.departmentId)
          : eq(jobRoles.departmentId, nextDepartmentId),
      );
      const siblings = await db
        .select({ title: jobRoles.title })
        .from(jobRoles)
        .where(and(...scopeConditions));
      if (siblings.some((s) => s.title.toLowerCase() === nextTitle.toLowerCase())) {
        return err("A job role with this name already exists for this scope.", 409);
      }
    }

    const updateData: Partial<typeof jobRoles.$inferInsert> = {};
    if (body.title !== undefined) updateData.title = nextTitle;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    await db
      .update(jobRoles)
      .set(updateData)
      .where(and(eq(jobRoles.id, id), eq(jobRoles.orgId, session.orgId)));

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admins and Owners can delete job roles.", 403);
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) return err("Invalid job role ID.", 400);

    const existing = await db.query.jobRoles.findFirst({
      where: and(eq(jobRoles.id, id), eq(jobRoles.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!existing) return err("Job role not found.", 404);

    // Job roles are referenced by free-text `users.designation` (not an FK), so
    // a hard delete never orphans an employee record. Remove the catalog entry.
    await db.delete(jobRoles).where(and(eq(jobRoles.id, id), eq(jobRoles.orgId, session.orgId)));

    return ok({ success: true });
  });
}
