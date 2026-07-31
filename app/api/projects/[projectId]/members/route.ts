

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectMembers, users, tickets, ticketAssignees, projects } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

async function projectInOrg(projectId: number, orgId: string): Promise<boolean> {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.orgId, orgId)),
    columns: { id: true },
  });
  return !!project;
}

async function canManageProjectMembers(
  projectId: number,
  orgId: string,
  role: string | undefined | null,
  userId: string
): Promise<boolean> {
  if (isAdminOrOwner(role)) return true;
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.orgId, orgId)),
    columns: { managerId: true },
  });
  return !!project && project.managerId === userId;
}

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.string().default("CONTRIBUTOR"),
});

const removeMemberSchema = z.object({
  userId: z.string().min(1),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);
    if (!(await projectInOrg(projectId, session.orgId))) return err("Project not found", 404);

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
      .where(eq(projectMembers.projectId, projectId));

    return ok(members);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);
    if (!(await projectInOrg(projectId, session.orgId))) return err("Project not found", 404);
    if (!(await canManageProjectMembers(projectId, session.orgId, session.user.role, session.user.id))) {
      return err("Only project managers or admins can add project members.", 403);
    }

    const body = await parseBody(req, addMemberSchema);

    const existing = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, body.userId)
      ),
    });

    if (existing) return err("User is already a project member", 409);

    const [member] = await db
      .insert(projectMembers)
      .values({
        projectId,
        userId: body.userId,
        role: body.role,
      })
      .returning();

    return ok(member, 201);
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);
    if (!(await projectInOrg(projectId, session.orgId))) return err("Project not found", 404);
    if (!(await canManageProjectMembers(projectId, session.orgId, session.user.role, session.user.id))) {
      return err("Only project managers or admins can remove project members.", 403);
    }

    const body = await parseBody(req, removeMemberSchema);

    const userId = body.userId;

    await db.delete(projectMembers).where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    );

    await db
      .update(tickets)
      .set({ assigneeId: null })
      .where(
        and(
          eq(tickets.projectId, projectId),
          eq(tickets.assigneeId, userId),
          ne(tickets.status, "DONE"),
          ne(tickets.status, "CANCELLED"),
        ),
      );

    const { inArray } = await import("drizzle-orm");
    const projectTicketIds = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(
        and(
          eq(tickets.projectId, projectId),
          ne(tickets.status, "DONE"),
          ne(tickets.status, "CANCELLED"),
        ),
      );

    if (projectTicketIds.length > 0) {
      const ids = projectTicketIds.map((t) => t.id);
      await db
        .delete(ticketAssignees)
        .where(
          and(
            eq(ticketAssignees.userId, userId),
            inArray(ticketAssignees.ticketId, ids),
          ),
        );
    }

    return ok({ success: true });
  });
}
