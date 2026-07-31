

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { cycles, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateCycleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "completed"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type RouteParams = { params: Promise<{ projectId: string; cycleId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, cycleId } = await params;
    const projectId = Number(id);
    const cId = Number(cycleId);
    if (!projectId || !cId) return err("Invalid id", 400);

    const body = await parseBody(req, updateCycleSchema);

    if (body.status === "active") {
      const [existing] = await db
        .select({ id: cycles.id })
        .from(cycles)
        .where(
          and(
            eq(cycles.status, "active"),
            eq(cycles.projectId, projectId),
            eq(cycles.orgId, session.orgId!)
          )
        )
        .limit(1);

      if (existing && existing.id !== cId) {
        return err("Only one active cycle is allowed at a time per project.", 409);
      }
    }

    const [updated] = await db
      .update(cycles)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(cycles.id, cId), eq(cycles.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("Cycle not found", 404);

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, cycleId } = await params;
    const projectId = Number(id);
    const cId = Number(cycleId);
    if (!projectId || !cId) return err("Invalid id", 400);

    await db
      .update(tickets)
      .set({ cycleId: null })
      .where(eq(tickets.cycleId, cId));

    await db
      .delete(cycles)
      .where(and(eq(cycles.id, cId), eq(cycles.orgId, session.orgId!)));

    return ok({ success: true });
  });
}
