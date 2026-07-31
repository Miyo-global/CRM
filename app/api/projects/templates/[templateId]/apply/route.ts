import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectTemplates, projects, tickets, projectMembers, projectStatuses } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { z } from "zod";

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
    const templateId = Number(idStr);
    if (!Number.isFinite(templateId)) return err("Invalid template ID", 400);

    const input = await parseBody(req, applySchema);
    

    const template = await db.query.projectTemplates.findFirst({
      where: and(eq(projectTemplates.id, templateId), eq(projectTemplates.orgId, session.orgId)),
      with: { tickets: { orderBy: (t, { asc }) => [asc(t.order)] } },
    });

    if (!template) return err("Template not found", 404);

    const namePart = input.name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    const key = (namePart.length >= 2 ? namePart : "PRJ") + "-" + randomPart;

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

    if (template.tickets.length > 0) {
      const [{ value: maxTN }] = await db
        .select({ value: count(tickets.id) })
        .from(tickets)
        .where(eq(tickets.projectId, project.id));

      await db.insert(tickets).values(
        template.tickets.map((t, i) => ({
          orgId: session.orgId,
          projectId: project.id,
          title: t.title,
          description: t.description ?? null,
          type: t.type ?? "TASK",
          status: "TODO",
          priority: (t.priority ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
          ticketNumber: Number(maxTN) + i + 1,
          order: t.order ?? i,
          originalEstimate: t.estimatedHours ? String(t.estimatedHours) : null,
          reporterId: session.user.id,
        })),
      );
    }

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
