import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";


const ROLE_TEMPLATES = [
  {
    id: "sales_rep",
    name: "Sales Representative",
    slug: "SALES_REP",
    permissions: ["LEADS:READ", "LEADS:WRITE", "DEALS:READ", "DEALS:WRITE", "TASKS:READ", "TASKS:WRITE"],
  },
  {
    id: "hr_admin",
    name: "HR Administrator",
    slug: "HR_ADMIN",
    permissions: ["HR:READ", "HR:WRITE", "HR:DELETE", "LEAVES:READ", "LEAVES:WRITE", "PAYROLL:READ"],
  },
  {
    id: "recruiter",
    name: "Recruiter",
    slug: "RECRUITER",
    permissions: ["HR:READ", "RECRUITMENT:READ", "RECRUITMENT:WRITE", "CANDIDATES:READ", "CANDIDATES:WRITE"],
  },
  {
    id: "project_manager",
    name: "Project Manager",
    slug: "PROJECT_MANAGER",
    permissions: ["PROJECTS:READ", "PROJECTS:WRITE", "TICKETS:READ", "TICKETS:WRITE", "TIMESHEETS:READ"],
  },
  {
    id: "viewer",
    name: "Read-Only Viewer",
    slug: "VIEWER",
    permissions: ["LEADS:READ", "DEALS:READ", "PROJECTS:READ", "HR:READ", "REPORTS:READ"],
  },
  {
    id: "branch_manager",
    name: "Branch Manager",
    slug: "BRANCH_MANAGER",
    permissions: ["LEADS:READ", "LEADS:WRITE", "DEALS:READ", "DEALS:WRITE", "HR:READ", "REPORTS:READ", "TASKS:READ", "TASKS:WRITE"],
  },
] as const;

const cloneSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[A-Z_]+$/).optional(),
});


export async function GET() {
  return withAuth(async () => {
    return ok(ROLE_TEMPLATES);
  });
}


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only CEO or Admin can create roles", 403);
    }

    const input = await parseBody(req, cloneSchema);
    

    const template = ROLE_TEMPLATES.find((t) => t.id === input.templateId);
    if (!template) return err("Template not found", 404);

    const slug = input.slug ?? template.slug;
    const name = input.name ?? template.name;

    const [existing] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.orgId, session.orgId), eq(roles.slug, slug)))
      .limit(1);
    if (existing) return err(`A role with slug "${slug}" already exists`, 409);

    const [created] = await db
      .insert(roles)
      .values({
        name,
        slug,
        orgId: session.orgId,
        isSystem: false,
        permissions: [...template.permissions],
      })
      .returning();

    if (!created) return err("Failed to create role", 500);

    await createAuditLog({
      action: "role.created",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(created.id),
      targetType: "role",
      metadata: { templateId: input.templateId, slug, name },
    });

    return ok(created, 201);
  });
}
