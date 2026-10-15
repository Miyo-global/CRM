import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectTemplates, tickets } from "@/lib/db/schema";
import { RANK_STEP } from "@/lib/projects/ticket-rank";

type Template = NonNullable<Awaited<ReturnType<typeof findTemplate>>>;

export function findTemplate(orgId: string, templateId: number) {
  return db.query.projectTemplates.findFirst({
    where: and(eq(projectTemplates.id, templateId), eq(projectTemplates.orgId, orgId)),
    with: { tickets: { orderBy: (t, { asc }) => [asc(t.order)] } },
  });
}

export async function copyTemplateTickets(
  template: Template,
  ctx: { orgId: string; projectId: number; actorId: string; status: string },
): Promise<number> {
  if (template.tickets.length === 0) return 0;
  await db.insert(tickets).values(
    template.tickets.map((t, i) => ({
      orgId: ctx.orgId,
      projectId: ctx.projectId,
      title: t.title,
      description: t.description ?? null,
      type: t.type ?? "TASK",
      status: ctx.status,
      priority: (t.priority ?? "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      ticketNumber: i + 1,
      order: t.order ?? i,
      rank: String((i + 1) * RANK_STEP),
      originalEstimate: t.estimatedHours ? String(t.estimatedHours) : null,
      reporterId: ctx.actorId,
    })),
  );
  return template.tickets.length;
}
