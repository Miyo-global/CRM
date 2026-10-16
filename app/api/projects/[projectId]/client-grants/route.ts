import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, projectClientGrants, users } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { clientPortalEnabled } from "@/lib/projects/client-access";

const grantSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter the client's email"),
  canViewMilestones: z.boolean().default(true),
  canViewTasks: z.boolean().default(false),
  canViewComments: z.boolean().default(false),
  canSubmitRequests: z.boolean().default(false),
  expiresAt: z.string().datetime().nullable().optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    if (!(await clientPortalEnabled(session.orgId))) return err("The client portal is turned off for your organization", 404);

    const grants = await db
      .select({
        id: projectClientGrants.id,
        status: projectClientGrants.status,
        expiresAt: projectClientGrants.expiresAt,
        canViewMilestones: projectClientGrants.canViewMilestones,
        canViewTasks: projectClientGrants.canViewTasks,
        canViewComments: projectClientGrants.canViewComments,
        canSubmitRequests: projectClientGrants.canSubmitRequests,
        user: { id: users.id, name: users.name, email: users.email },
      })
      .from(projectClientGrants)
      .innerJoin(users, eq(users.id, projectClientGrants.userId))
      .where(and(eq(projectClientGrants.projectId, guard.projectId), eq(projectClientGrants.status, "ACTIVE")))
      .orderBy(desc(projectClientGrants.createdAt))
      .limit(100);
    return ok(grants);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    if (!(await clientPortalEnabled(session.orgId))) return err("The client portal is turned off for your organization", 404);
    const { email, expiresAt, ...caps } = await parseBody(req, grantSchema);

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(organizationMembers, and(eq(organizationMembers.userId, users.id), eq(organizationMembers.orgId, session.orgId)))
      .where(eq(users.email, email))
      .limit(1);
    if (!user) return err("No one in your organization uses that email. Invite them first.", 404);

    const [grant] = await db
      .insert(projectClientGrants)
      .values({
        orgId: session.orgId,
        projectId: guard.projectId,
        userId: user.id,
        grantedBy: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        ...caps,
      })
      .onConflictDoNothing()
      .returning({ id: projectClientGrants.id });
    if (!grant) return err("This person already has access", 409);
    return ok(grant, 201);
  });
}
