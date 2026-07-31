

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { modules, tickets } from "@/lib/db/schema";
import { eq, and, count, notInArray } from "drizzle-orm";
import { z } from "zod";
import { canUserManageProjectModules } from "@/lib/projects/module-access";

const updateModuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z
    .enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"])
    .optional(),
  leadId: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

type RouteParams = { params: Promise<{ projectId: string; moduleId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, moduleId } = await params;
    const projectId = Number(id);
    const mId = Number(moduleId);
    if (!projectId || !mId) return err("Invalid id", 400);

    const allowed = await canUserManageProjectModules({
      orgId: session.orgId!,
      projectId,
      userId: session.user.id,
      orgRole: session.user.role,
    });
    if (!allowed) {
      return err("You do not have permission to update modules for this project.", 403);
    }

    const body = await parseBody(req, updateModuleSchema);

    const [updated] = await db
      .update(modules)
      .set({
        ...body,
        leadId: body.leadId === "" ? null : body.leadId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(modules.id, mId),
          eq(modules.projectId, projectId),
          eq(modules.orgId, session.orgId!),
        ),
      )
      .returning();

    if (!updated) return err("Module not found", 404);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, moduleId } = await params;
    const projectId = Number(id);
    const mId = Number(moduleId);
    if (!projectId || !mId) return err("Invalid id", 400);

    const allowed = await canUserManageProjectModules({
      orgId: session.orgId!,
      projectId,
      userId: session.user.id,
      orgRole: session.user.role,
    });
    if (!allowed) {
      return err("You do not have permission to delete modules for this project.", 403);
    }

    const mod = await db.query.modules.findFirst({
      where: and(
        eq(modules.id, mId),
        eq(modules.projectId, projectId),
        eq(modules.orgId, session.orgId!),
      ),
      columns: { id: true },
    });
    if (!mod) return err("Module not found", 404);

    const terminalStatuses = ["DONE", "CANCELLED", "CLOSED"] as const;

    const [activeRow] = await db
      .select({
        n: count(),
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.moduleId, mId),
          eq(tickets.projectId, projectId),
          notInArray(tickets.status, [...terminalStatuses]),
        ),
      );

    const active = Number(activeRow?.n ?? 0);
    if (active > 0) {
      return err(
        `Cannot delete this module: ${active} open work item(s) are still assigned. Complete, cancel, or move them first.`,
        409,
      );
    }

    await db
      .update(tickets)
      .set({ moduleId: null })
      .where(eq(tickets.moduleId, mId));

    await db
      .delete(modules)
      .where(
        and(
          eq(modules.id, mId),
          eq(modules.projectId, projectId),
          eq(modules.orgId, session.orgId!),
        ),
      );

    return ok({ success: true });
  });
}
