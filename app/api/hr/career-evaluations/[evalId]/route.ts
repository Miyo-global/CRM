import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { careerEvaluations, careerAuditLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isAdminOrOwner } from "@/lib/constants/roles";

const READINESS = ["NOT_READY", "DEVELOPING", "READY_SOON", "RECOMMENDED"] as const;

const updateSchema = z.object({
  readinessStatus: z.enum(READINESS).optional(),
  strengths: z.string().max(2000).trim().optional().nullable(),
  areasToGrow: z.string().max(2000).trim().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  level: z.number().int().positive().max(20).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ evalId: string }> }) {
  return withAuth(async (session) => {
    const { evalId } = await params;
    const id = parseInt(evalId, 10);
    if (isNaN(id)) return err("Invalid id", 400);

    const [evaluation] = await db
      .select()
      .from(careerEvaluations)
      .where(and(eq(careerEvaluations.id, id), eq(careerEvaluations.orgId, session.orgId)));

    if (!evaluation) return err("Not found", 404);
    return ok(evaluation);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ evalId: string }> }) {
  return withAuth(async (session) => {
    const role = session.user.role as string;
    if (!isAdminOrOwner(role)) return err("Forbidden", 403);

    const { evalId } = await params;
    const id = parseInt(evalId, 10);
    if (isNaN(id)) return err("Invalid id", 400);

    const body = updateSchema.parse(await req.json());

    const [existing] = await db
      .select({ id: careerEvaluations.id, employeeUserId: careerEvaluations.employeeUserId })
      .from(careerEvaluations)
      .where(and(eq(careerEvaluations.id, id), eq(careerEvaluations.orgId, session.orgId)));

    if (!existing) return err("Not found", 404);

    const payload: Record<string, unknown> = {};
    if (body.readinessStatus !== undefined) payload.readinessStatus = body.readinessStatus;
    if (body.strengths !== undefined) payload.strengths = body.strengths;
    if (body.areasToGrow !== undefined) payload.areasToGrow = body.areasToGrow;
    if (body.notes !== undefined) payload.notes = body.notes;
    if (body.level !== undefined) payload.level = body.level;

    const [updated] = await db
      .update(careerEvaluations)
      .set(payload)
      .where(eq(careerEvaluations.id, id))
      .returning();

    await db.insert(careerAuditLogs).values({
      orgId: session.orgId,
      actorUserId: session.user.id,
      targetUserId: existing.employeeUserId,
      action: "UPDATE_EVALUATION",
      entity: "career_evaluations",
      entityId: id,
      changes: payload,
    });

    return ok(updated);
  });
}
