import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobRoles, departments } from "@/lib/db/schema";
import { and, asc, eq, or, isNull } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const JOB_ROLE_TITLE_MIN = 2;
const JOB_ROLE_TITLE_MAX = 120;

const listQuerySchema = z.object({
  departmentId: z
    .string()
    .optional()
    .transform((v) => (v == null || v === "" ? undefined : Number(v)))
    .refine((v) => v === undefined || (Number.isInteger(v) && v > 0), {
      message: "Invalid departmentId",
    }),
  includeInactive: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

const titleSchema = z
  .string()
  .trim()
  .min(JOB_ROLE_TITLE_MIN, `Job role must be at least ${JOB_ROLE_TITLE_MIN} characters`)
  .max(JOB_ROLE_TITLE_MAX, `Job role must be at most ${JOB_ROLE_TITLE_MAX} characters`)
  .refine((v) => /[A-Za-z0-9]/.test(v), "Job role must contain at least one letter or number");

const createSchema = z.object({
  title: titleSchema,
  departmentId: z.number().int().positive().nullable().optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { departmentId, includeInactive } = parseQuery(req, listQuerySchema);

    const conditions = [eq(jobRoles.orgId, session.orgId)];
    if (!includeInactive) {
      conditions.push(eq(jobRoles.isActive, true));
    }
    // When a department is supplied, return that department's roles plus
    // org-wide roles (departmentId IS NULL). With no department, return all.
    if (departmentId !== undefined) {
      const scoped = or(eq(jobRoles.departmentId, departmentId), isNull(jobRoles.departmentId));
      if (scoped) conditions.push(scoped);
    }

    const rows = await db
      .select({
        id: jobRoles.id,
        title: jobRoles.title,
        departmentId: jobRoles.departmentId,
        isActive: jobRoles.isActive,
        createdAt: jobRoles.createdAt,
        departmentName: departments.name,
      })
      .from(jobRoles)
      .leftJoin(departments, eq(jobRoles.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(asc(jobRoles.title));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only Admins and Owners can create job roles.", 403);
    }

    const body = await parseBody(req, createSchema);
    const title = body.title.trim();
    const departmentId = body.departmentId ?? null;

    // A department-scoped role must reference a department in this org.
    if (departmentId !== null) {
      const dept = await db.query.departments.findFirst({
        where: and(eq(departments.id, departmentId), eq(departments.orgId, session.orgId)),
        columns: { id: true },
      });
      if (!dept) return err("Department not found.", 404);
    }

    // Enforce case-insensitive uniqueness within the org for the same scope so
    // "Senior Engineer" and "senior engineer" don't both exist.
    const scopeConditions = [eq(jobRoles.orgId, session.orgId)];
    scopeConditions.push(departmentId === null ? isNull(jobRoles.departmentId) : eq(jobRoles.departmentId, departmentId));
    const existing = await db
      .select({ id: jobRoles.id, title: jobRoles.title, isActive: jobRoles.isActive })
      .from(jobRoles)
      .where(and(...scopeConditions));
    const match = existing.find((r) => r.title.toLowerCase() === title.toLowerCase());
    if (match) {
      // Re-activate a previously archived role instead of erroring, so admins
      // are never blocked by a soft-deleted duplicate they can't see.
      if (match.isActive === false) {
        await db
          .update(jobRoles)
          .set({ isActive: true, title })
          .where(and(eq(jobRoles.id, match.id), eq(jobRoles.orgId, session.orgId)));
        return ok({ success: true, id: match.id, reactivated: true });
      }
      return err("A job role with this name already exists for this scope.", 409);
    }

    const [created] = await db
      .insert(jobRoles)
      .values({
        orgId: session.orgId,
        departmentId,
        title,
        isActive: true,
        createdById: session.user.id,
      })
      .returning({ id: jobRoles.id });

    return ok({ success: true, id: created?.id });
  });
}
