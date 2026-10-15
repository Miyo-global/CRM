import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, projectMembers, projectStatuses } from "@/lib/db/schema";
import { findTemplate, copyTemplateTickets } from "@/lib/projects/apply-template";
import { firstFreeProjectKey } from "@/lib/projects/project-key-availability";
import { z } from "zod";
import { parseIdParam } from "@/lib/projects/require-project-access";

const applySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  managerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type RouteContext = { params: Promise<{ templateId: string }> };


export async function POST(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { templateId: idStr } = await ctx.params;
    const templateId = parseIdParam(idStr);
    if (templateId === null) return err("Template not found", 404);

    const input = await parseBody(req, applySchema);
    

    const template = await findTemplate(session.orgId, templateId);
    if (!template) return err("Template not found", 404);

    const key = await firstFreeProjectKey(input.name);
    if (!key) return err("Could not generate a free project key", 409);

    const [project] = await db
      .insert(projects)
      .values({
        orgId: session.orgId,
        name: input.name,
        description: input.description ?? template.description ?? null,
        key,
        managerId: input.managerId ?? session.user.id,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      })
      .returning();

    if (!project) return err("Failed to create project", 500);

    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: session.user.id,
      role: "OWNER",
    });

    const DEFAULT_STATUSES = [
      { name: "To Do", color: "#94a3b8", order: 0 },
      { name: "In Progress", color: "#3b82f6", order: 1 },
      { name: "Done", color: "#22c55e", order: 2 },
    ];

    await db
      .insert(projectStatuses)
      .values(DEFAULT_STATUSES.map((s) => ({ ...s, orgId: session.orgId, projectId: project.id })))
      .returning();

    await copyTemplateTickets(template, { orgId: session.orgId, projectId: project.id, actorId: session.user.id, status: "To Do" });

    return ok(
      {
        projectId: project.id,
        key: project.key,
        ticketsCreated: template.tickets.length,
      },
      201,
    );
  });
}
