import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectStatuses } from "@/lib/db/schema";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

const statusSchema = z.object({
  wipLimit: z.number().int().min(1).max(500).nullable(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; statusId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, statusId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    const id = parseIdParam(statusId);
    if (id === null) return err("Column not found", 404);

    const body = await parseBody(req, statusSchema);
    const [updated] = await db
      .update(projectStatuses)
      .set({ wipLimit: body.wipLimit, updatedAt: new Date() })
      .where(and(eq(projectStatuses.id, id), eq(projectStatuses.projectId, guard.projectId), eq(projectStatuses.orgId, session.orgId)))
      .returning({ id: projectStatuses.id, name: projectStatuses.name, wipLimit: projectStatuses.wipLimit });
    if (!updated) return err("Column not found", 404);
    return ok(updated);
  });
}
