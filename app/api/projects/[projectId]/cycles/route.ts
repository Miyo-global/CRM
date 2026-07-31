

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { cycles, tickets } from "@/lib/db/schema";
import { eq, and, or, lte, gte, count, sql } from "drizzle-orm";
import { z } from "zod";

const createCycleSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const conditions = [
      eq(cycles.projectId, projectId),
      eq(cycles.orgId, session.orgId!),
    ];
    if (status) {
      conditions.push(
        eq(cycles.status, status as "draft" | "active" | "completed")
      );
    }

    const cycleList = await db
      .select()
      .from(cycles)
      .where(and(...conditions))
      .orderBy(cycles.startDate);

    if (cycleList.length === 0) return ok([]);

    const cycleIds = cycleList.map((c) => c.id);
    const statsRows = await db
      .select({
        cycleId: tickets.cycleId,
        total: count(),
        completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
      })
      .from(tickets)
      .where(
        sql`${tickets.cycleId} IN (${sql.join(cycleIds.map((cid) => sql`${cid}`), sql`, `)})`
      )
      .groupBy(tickets.cycleId);

    const statsMap = new Map(statsRows.map((s) => [s.cycleId, s]));

    const data = cycleList.map((cycle) => {
      const stats = statsMap.get(cycle.id);
      const total = Number(stats?.total ?? 0);
      const completed = Number(stats?.completed ?? 0);
      return {
        ...cycle,
        totalItems: total,
        completedItems: completed,
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

    const body = await parseBody(req, createCycleSchema);

    const overlapping = await db
      .select({ id: cycles.id })
      .from(cycles)
      .where(
        and(
          eq(cycles.projectId, projectId),
          eq(cycles.orgId, session.orgId!),
          or(
            and(lte(cycles.startDate, body.startDate), gte(cycles.endDate, body.startDate)),
            and(lte(cycles.startDate, body.endDate), gte(cycles.endDate, body.endDate)),
            and(gte(cycles.startDate, body.startDate), lte(cycles.endDate, body.endDate))
          )
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      return err("Cycle dates overlap with an existing cycle.", 409);
    }

    const [cycle] = await db
      .insert(cycles)
      .values({
        projectId,
        orgId: session.orgId!,
        name: body.name,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        createdBy: session.user.id,
      })
      .returning();

    return ok(cycle, 201);
  });
}
