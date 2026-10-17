import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projectStatuses, tickets } from "@/lib/db/schema";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

const statusSchema = z.object({
  wipLimit: z.number().int().min(1).max(500).nullable().optional(),
  name: z.string().trim().min(1).max(40).optional(),
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
    const where = and(eq(projectStatuses.id, id), eq(projectStatuses.projectId, guard.projectId), eq(projectStatuses.orgId, session.orgId));

    // project_statuses is the source of truth for columns; tickets.status is the
    // denormalised key, so a rename rewrites both in one transaction (MIYO-0070).
    const result = await db.transaction(async (tx) => {
      const current = await tx.query.projectStatuses.findFirst({ where, columns: { name: true } });
      if (!current) return null;
      const newName = body.name?.toUpperCase().replace(/\s+/g, "_");
      if (newName && newName !== current.name) {
        const clash = await tx.query.projectStatuses.findFirst({
          where: and(eq(projectStatuses.projectId, guard.projectId), eq(projectStatuses.name, newName)),
          columns: { id: true },
        });
        if (clash) return "clash" as const;
        await tx
          .update(tickets)
          .set({ status: newName, updatedAt: new Date() })
          .where(and(eq(tickets.projectId, guard.projectId), eq(tickets.status, current.name)));
      }
      const [row] = await tx
        .update(projectStatuses)
        .set({
          ...(body.wipLimit !== undefined ? { wipLimit: body.wipLimit } : {}),
          ...(newName ? { name: newName } : {}),
          updatedAt: new Date(),
        })
        .where(where)
        .returning({ id: projectStatuses.id, name: projectStatuses.name, wipLimit: projectStatuses.wipLimit });
      return row ?? null;
    });
    if (result === "clash") return err("A column with that name already exists", 409);
    const updated = result;
    if (!updated) return err("Column not found", 404);
    return ok(updated);
  });
}
