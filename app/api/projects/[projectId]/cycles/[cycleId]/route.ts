

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { cycles, tickets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";
import { completeCycle } from "@/lib/projects/complete-cycle";

type RouteParams = { params: Promise<{ projectId: string; cycleId: string }> };
import { loadCycleDetail } from "@/lib/projects/cycle-detail";

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, cycleId } = await params;
    const guard = await requireProjectAccess(session, id, "view");
    if (!guard.ok) return guard.response;
    const cId = parseIdParam(cycleId);
    if (cId === null) return err("Cycle not found", 404);
    const detail = await loadCycleDetail(session.orgId, guard.projectId, cId);
    return detail ? ok(detail) : err("Cycle not found", 404);
  });
}

const updateCycleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["draft", "active", "completed"]).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  carryForwardCycleId: z.number().int().positive().nullable().optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, cycleId } = await params;
    const guard = await requireProjectAccess(session, id, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const cId = parseIdParam(cycleId);
    if (cId === null) return err("Not found", 404);

    const { carryForwardCycleId, ...body } = await parseBody(req, updateCycleSchema);

    if (body.status === "completed") {
      const outcome = await completeCycle({
        orgId: session.orgId,
        projectId,
        cycleId: cId,
        carryForwardCycleId: carryForwardCycleId ?? null,
        actorId: session.user.id,
      });
      if (outcome.kind === "not_found") return err("Cycle not found", 404);
      if (outcome.kind === "invalid_target") return err(outcome.message, 400);
      return ok<Record<string, unknown>>({ id: cId, status: "completed", carried: outcome.carried });
    }

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
      .where(and(eq(cycles.id, cId), eq(cycles.projectId, projectId), eq(cycles.orgId, session.orgId!)))
      .returning();

    if (!updated) return err("Cycle not found", 404);

    return ok<Record<string, unknown>>(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id, cycleId } = await params;
    const guard = await requireProjectAccess(session, id, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const cId = parseIdParam(cycleId);
    if (cId === null) return err("Not found", 404);

    const cycle = await db.query.cycles.findFirst({
      where: and(eq(cycles.id, cId), eq(cycles.projectId, projectId), eq(cycles.orgId, session.orgId!)),
      columns: { id: true },
    });
    if (!cycle) return err("Cycle not found", 404);

    await db
      .update(tickets)
      .set({ cycleId: null })
      .where(and(eq(tickets.cycleId, cId), eq(tickets.projectId, projectId), eq(tickets.orgId, session.orgId!)));

    await db
      .delete(cycles)
      .where(and(eq(cycles.id, cId), eq(cycles.projectId, projectId), eq(cycles.orgId, session.orgId!)));

    return ok({ success: true });
  });
}
