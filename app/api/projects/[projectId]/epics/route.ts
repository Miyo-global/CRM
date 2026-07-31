

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

const createEpicSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  points: z.number().optional(),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const epics = await db.query.tickets.findMany({
      where: and(
        eq(tickets.orgId, session.orgId!),
        eq(tickets.projectId, projectId),
        eq(tickets.type, "EPIC")
      ),
      with: { assignee: true },
      orderBy: [desc(tickets.createdAt)],
    });

    return ok(epics);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const body = await parseBody(req, createEpicSchema);

    const [epic] = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${projectId})`);

      const maxResult = await tx
        .select({
          maxTicketNumber: sql<number>`COALESCE(MAX(${tickets.ticketNumber}), 0)`,
        })
        .from(tickets)
        .where(and(eq(tickets.projectId, projectId), eq(tickets.orgId, session.orgId!)));

      const nextNumber = (maxResult[0]?.maxTicketNumber || 0) + 1;

      return tx
        .insert(tickets)
        .values({
          orgId: session.orgId!,
          projectId,
          ticketNumber: nextNumber,
          title: body.title,
          description: body.description,
          type: "EPIC",
          priority: body.priority ?? "MEDIUM",
          assigneeId: body.assigneeId,
          reporterId: session.user.id,
          points: body.points,
          startDate: body.startDate ?? null,
          dueDate: body.dueDate ?? null,
          status: "TODO",
        })
        .returning();
    });

    return ok(epic, 201);
  });
}
