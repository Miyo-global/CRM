import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectMembers, users, tickets, ticketAssignees, projects } from "@/lib/db/schema";
import { eq, and, ne, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { projectRoleSchema } from "@/lib/projects/project-roles";
import { allOrgMembers } from "@/lib/projects/assignable-users";
import { leavesProjectWithoutLead } from "@/lib/projects/member-guard";

const addMemberSchema = z.object({
  userId: z.string().min(1).max(200),
  role: projectRoleSchema.default("CONTRIBUTOR"),
}).strict();

const updateMemberSchema = z.object({
  userId: z.string().min(1).max(200),
  role: projectRoleSchema,
}).strict();

const removeMemberSchema = z.object({
  userId: z.string().min(1).max(200),
}).strict();

type RouteParams = { params: Promise<{ projectId: string }> };

const LEAD_REQUIRED = "A project needs at least one owner or manager. Make someone else a manager first.";

async function leadCheck(projectId: number, userId: string, nextRole: z.infer<typeof projectRoleSchema> | null) {
  const [project, members] = await Promise.all([
    db.query.projects.findFirst({ where: eq(projects.id, projectId), columns: { managerId: true } }),
    db.select({ userId: projectMembers.userId, role: projectMembers.role }).from(projectMembers).where(eq(projectMembers.projectId, projectId)),
  ]);
  return leavesProjectWithoutLead(members, project?.managerId ?? null, { userId, nextRole });
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;

    const members = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        email: users.email,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, guard.projectId))
      .limit(200);

    return ok(members);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    const body = await parseBody(req, addMemberSchema);
    if (body.role === "OWNER" && guard.role !== "OWNER") return err("Only owners can add another owner", 403);

    if (!(await allOrgMembers(session.orgId, [body.userId]))) return err("User not found", 404);

    const existing = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.projectId, guard.projectId), eq(projectMembers.userId, body.userId)),
      columns: { id: true },
    });
    if (existing) return err("User is already a project member", 409);

    const [member] = await db
      .insert(projectMembers)
      .values({ projectId: guard.projectId, userId: body.userId, role: body.role })
      .returning({ id: projectMembers.id, userId: projectMembers.userId, role: projectMembers.role, joinedAt: projectMembers.joinedAt });

    return ok(member, 201);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    const body = await parseBody(req, updateMemberSchema);
    if (body.role === "OWNER" && guard.role !== "OWNER") return err("Only owners can make someone an owner", 403);

    const scope = and(eq(projectMembers.projectId, guard.projectId), eq(projectMembers.userId, body.userId));
    const existing = await db.query.projectMembers.findFirst({ where: scope, columns: { id: true } });
    if (!existing) return err("Member not found", 404);
    if (await leadCheck(guard.projectId, body.userId, body.role)) return err(LEAD_REQUIRED, 409);

    const [member] = await db
      .update(projectMembers)
      .set({ role: body.role })
      .where(scope)
      .returning({ userId: projectMembers.userId, role: projectMembers.role });
    return ok(member);
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const { userId } = await parseBody(req, removeMemberSchema);

    const scope = and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId));
    const existing = await db.query.projectMembers.findFirst({ where: scope, columns: { id: true } });
    if (!existing) return err("Member not found", 404);
    if (await leadCheck(projectId, userId, null)) return err(LEAD_REQUIRED, 409);

    await db.transaction(async (tx) => {
      await tx.delete(projectMembers).where(scope);
      const openTickets = and(
        eq(tickets.projectId, projectId),
        isNull(tickets.deletedAt),
        ne(tickets.status, "DONE"),
        ne(tickets.status, "CANCELLED"),
      );
      await tx.update(tickets).set({ assigneeId: null }).where(and(openTickets, eq(tickets.assigneeId, userId)));
      const open = await tx.select({ id: tickets.id }).from(tickets).where(openTickets);
      if (open.length > 0) {
        await tx
          .delete(ticketAssignees)
          .where(and(eq(ticketAssignees.userId, userId), inArray(ticketAssignees.ticketId, open.map((t) => t.id))));
      }
    });

    return ok({ success: true });
  });
}
