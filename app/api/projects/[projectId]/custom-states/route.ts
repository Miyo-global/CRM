

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { customStates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createStateSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  group: z.enum(["backlog", "unstarted", "started", "completed", "cancelled"]),
  sequence: z.number().int().min(0),
  isDefault: z.boolean().default(false),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const states = await db
      .select()
      .from(customStates)
      .where(
        and(
          eq(customStates.projectId, projectId),
          eq(customStates.orgId, session.orgId!)
        )
      )
      .orderBy(customStates.sequence);

    return ok(states);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const body = await parseBody(req, createStateSchema);

    const [state] = await db
      .insert(customStates)
      .values({
        projectId,
        orgId: session.orgId!,
        name: body.name,
        color: body.color,
        group: body.group,
        sequence: body.sequence,
        isDefault: body.isDefault,
      })
      .returning();

    return ok(state, 201);
  });
}
