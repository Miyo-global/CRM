

import { NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { sprints } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const createSprintSchema = z
  .object({
    name: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
    goal: z.string().optional(),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const result = await db.query.sprints.findMany({
      where: and(eq(sprints.orgId, session.orgId!), eq(sprints.projectId, projectId)),
      with: { tickets: { with: { assignee: true } } },
      orderBy: [desc(sprints.startDate)],
    });

    return ok(result);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAdmin(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

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
