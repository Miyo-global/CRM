

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, projectMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  ticketIds: z.array(z.number().int().positive()).min(1),
  assigneeId: z.string().optional(),
  status: z.string().optional(),
  sprintId: z.number().int().positive().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
}).refine(
  (data) => data.assigneeId !== undefined || data.status !== undefined || data.sprintId !== undefined || data.priority !== undefined,
  { message: "At least one field to update is required" }
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth(async (session) => {
    const { projectId: rawId } = await params;
    const projectId = Number(rawId);
    if (!projectId) return err("Invalid project ID.", 400);

    const member = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, session.user.id)
      ),
    });
    if (!member) return err("Not a project member.", 403);

    const body = await parseBody(req, bulkUpdateSchema);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.assigneeId !== undefined) {
      updateData.assigneeId =
        body.assigneeId === "" || body.assigneeId === "unassigned"
          ? null
          : body.assigneeId;
    }
    if (body.status !== undefined) updateData.status = body.status;
    if (body.sprintId !== undefined) updateData.sprintId = body.sprintId;
    if (body.priority !== undefined) updateData.priority = body.priority;

    const updated = await db
      .update(tickets)
      .set(updateData)
      .where(
        and(
          eq(tickets.orgId, session.orgId!),
          eq(tickets.projectId, projectId),
          inArray(tickets.id, body.ticketIds)
        )
      )
      .returning({ id: tickets.id });

    return ok({ updated: updated.length, ticketIds: updated.map((t) => t.id) });
  });
}
