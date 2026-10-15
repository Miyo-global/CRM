

import { NextRequest } from "next/server";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketLabels } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";

const createLabelSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const guard = await requireProjectAccess(session, id, "view");
    if (!guard.ok) return guard.response;

    const labels = await db.query.ticketLabels.findMany({
      where: eq(ticketLabels.orgId, session.orgId!),
      orderBy: [desc(ticketLabels.createdAt)],
      limit: 100,
    });
    return ok(labels);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const guard = await requireProjectAccess(session, id, "manage");
    if (!guard.ok) return guard.response;

    const body = await parseBody(req, createLabelSchema);

    const [label] = await db
      .insert(ticketLabels)
      .values({
        orgId: session.orgId!,
        name: body.name,
        color: body.color ?? "#3B82F6",
      })
      .returning();

    return ok(label, 201);
  });
}
