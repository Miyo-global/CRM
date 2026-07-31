

import { NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { sprints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  goal: z.string().optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
});

type RouteParams = { params: Promise<{ projectId: string; sprintId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { sprintId } = await params;
    const id = Number(sprintId);
    if (!id) return err("Invalid sprint id", 400);

    const sprint = await db.query.sprints.findFirst({
      where: and(eq(sprints.id, id), eq(sprints.orgId, session.orgId!)),
      with: { tickets: { with: { assignee: true } } },
    });

    if (!sprint) return err("Sprint not found", 404);

    return ok(sprint);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAdmin(async (session) => {
    const { sprintId } = await params;
    const id = Number(sprintId);
    if (!id) return err("Invalid sprint id", 400);

    const body = await parseBody(req, updateSprintSchema);

    if (body.startDate || body.endDate) {
      const existing = await db.query.sprints.findFirst({
        where: and(eq(sprints.id, id), eq(sprints.orgId, session.orgId!)),
      });
      if (!existing) return err("Sprint not found", 404);
      const start = body.startDate ? new Date(body.startDate) : existing.startDate;
      const end = body.endDate ? new Date(body.endDate) : existing.endDate;
      if (new Date(end) <= new Date(start)) {
        return err("End date must be after start date", 400);
      }
    }

    await db
      .update(sprints)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.goal !== undefined && { goal: body.goal }),
        ...(body.status && { status: body.status }),
      })
      .where(and(eq(sprints.id, id), eq(sprints.orgId, session.orgId!)));

    return ok({ success: true });
  });
}
