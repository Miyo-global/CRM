import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, projectMembers, users } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { projectRoleSchema } from "@/lib/projects/project-roles";
import { createOrgInvitation } from "@/lib/org/create-invitation";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: projectRoleSchema.default("CONTRIBUTOR"),
}).strict();

type RouteParams = { params: Promise<{ projectId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    const body = await parseBody(req, inviteSchema);
    if (body.role === "OWNER" && guard.role !== "OWNER") return err("Only owners can invite another owner", 403);

    const user = await db.query.users.findFirst({ where: eq(users.email, body.email), columns: { id: true } });
    const orgMember = user
      ? await db.query.organizationMembers.findFirst({
          where: and(eq(organizationMembers.userId, user.id), eq(organizationMembers.orgId, session.orgId)),
          columns: { id: true },
        })
      : undefined;

    if (user && orgMember) {
      const [member] = await db
        .insert(projectMembers)
        .values({ projectId: guard.projectId, userId: user.id, role: body.role })
        .onConflictDoNothing()
        .returning({ userId: projectMembers.userId });
      if (!member) return err("This person is already on the project", 409);
      return ok({ added: true, invited: false }, 201);
    }

    if (!isAdminOrOwner(session.user.role)) {
      return err("This person is not in your organization yet. Ask an admin to invite them.", 403);
    }

    const result = await createOrgInvitation({
      orgId: session.orgId,
      email: body.email,
      role: "EMPLOYEE",
      invitedBy: session.user.id,
      actorRole: session.user.role,
      projectId: guard.projectId,
      projectRole: body.role,
    });
    if (!result.ok) return err(result.message, result.status);
    return ok({ added: false, invited: true }, 201);
  });
}
