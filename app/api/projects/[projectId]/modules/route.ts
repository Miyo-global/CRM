

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { modules, tickets } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { z } from "zod";
import { canUserManageProjectModules } from "@/lib/projects/module-access";

const createModuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z
    .enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"])
    .default("backlog"),
  leadId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const moduleList = await db
      .select()
      .from(modules)
      .where(and(eq(modules.projectId, projectId), eq(modules.orgId, session.orgId!)))
      .orderBy(modules.name);

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
        sql`${tickets.moduleId} IN (${sql.join(moduleIds.map((mid) => sql`${mid}`), sql`, `)})`
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
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const allowed = await canUserManageProjectModules({
      orgId: session.orgId!,
      projectId,
      userId: session.user.id,
      orgRole: session.user.role,
    });
    if (!allowed) {
      return err("You do not have permission to create modules for this project.", 403);
    }

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
