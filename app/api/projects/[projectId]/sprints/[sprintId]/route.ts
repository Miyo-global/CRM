

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { sprints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

const updateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  goal: z.string().optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; sprintId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, sprintId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const id = parseIdParam(sprintId);
    if (id === null) return err("Not found", 404);

    const sprint = await db.query.sprints.findFirst({
      where: and(eq(sprints.id, id), eq(sprints.projectId, projectId), eq(sprints.orgId, session.orgId!)),
      with: { tickets: { with: { assignee: { columns: { id: true, name: true, email: true, image: true } } } } },
    });

    if (!sprint) return err("Sprint not found", 404);

    return ok(sprint);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, sprintId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const id = parseIdParam(sprintId);
    if (id === null) return err("Not found", 404);

    const body = await parseBody(req, updateSprintSchema);

    const existing = await db.query.sprints.findFirst({
      where: and(eq(sprints.id, id), eq(sprints.projectId, projectId), eq(sprints.orgId, session.orgId!)),
    });
    if (!existing) return err("Sprint not found", 404);

    if (body.startDate || body.endDate) {
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
      .where(and(eq(sprints.id, id), eq(sprints.projectId, projectId), eq(sprints.orgId, session.orgId!)));

    return ok({ success: true });
  });
}
