

import { NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { sprints } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

const createSprintSchema = z
  .object({
    name: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    goal: z.string().optional(),
  })
  .strict()
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const guard = await requireProjectAccess(session, id, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const result = await db.query.sprints.findMany({
      where: and(eq(sprints.orgId, session.orgId!), eq(sprints.projectId, projectId)),
      with: { tickets: { with: { assignee: { columns: { id: true, name: true, email: true, image: true } } } } },
      orderBy: [desc(sprints.startDate)],
      limit: 100,
    });

    return ok(result);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const guard = await requireProjectAccess(session, id, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const body = await parseBody(req, createSprintSchema);

    const [sprint] = await db
      .insert(sprints)
      .values({
        orgId: session.orgId!,
        projectId,
        name: body.name,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        goal: body.goal,
        status: "PLANNED",
      })
      .returning();

    return ok(sprint, 201);
  });
}
