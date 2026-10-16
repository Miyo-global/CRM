

import { NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { modules, tickets } from "@/lib/db/schema";
import { eq, and, count, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

const createModuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z
    .enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"])
    .default("backlog"),
  leadId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const guard = await requireProjectAccess(session, id, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const moduleList = await db
      .select()
      .from(modules)
      .where(and(eq(modules.projectId, projectId), eq(modules.orgId, session.orgId!)))
      .orderBy(modules.name)
      .limit(100);

    if (moduleList.length === 0) return ok([]);

    const moduleIds = moduleList.map((m) => m.id);
    const statsRows = await db
      .select({
        moduleId: tickets.moduleId,
        total: count(),
        completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
        activeTickets: count(
          sql`CASE WHEN ${tickets.status} NOT IN ('DONE', 'CANCELLED', 'CLOSED') THEN 1 END`
        ),
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.projectId, projectId),
          isNull(tickets.deletedAt),
          sql`${tickets.moduleId} IN (${sql.join(moduleIds.map((mid) => sql`${mid}`), sql`, `)})`
        )
      )
      .groupBy(tickets.moduleId);

    const statsMap = new Map(statsRows.map((s) => [s.moduleId, s]));

    const data = moduleList.map((mod) => {
      const stats = statsMap.get(mod.id);
      const total = Number(stats?.total ?? 0);
      const completed = Number(stats?.completed ?? 0);
      const activeTickets = Number(stats?.activeTickets ?? 0);
      return {
        ...mod,
        totalItems: total,
        completedItems: completed,
        activeTicketCount: activeTickets,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const guard = await requireProjectAccess(session, id, "manage");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const body = await parseBody(req, createModuleSchema);

    const [mod] = await db
      .insert(modules)
      .values({
        projectId,
        orgId: session.orgId!,
        name: body.name,
        description: body.description,
        status: body.status,
        leadId: body.leadId,
        startDate: body.startDate,
        endDate: body.endDate,
        createdBy: session.user.id,
      })
      .returning();

    return ok(mod, 201);
  });
}
