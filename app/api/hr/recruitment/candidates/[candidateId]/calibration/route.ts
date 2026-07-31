import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { calibrationSessions, candidates } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ candidateId: string }> };

const createSchema = z.object({
  jobPostingId: z.number().int().positive().optional(),
  scheduledAt: z.string().datetime().optional(),
  participantIds: z.array(z.string()).default([]),
  notes: z.string().max(5000).optional(),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: z.enum(["pending", "scheduled", "completed", "cancelled"]).optional(),
  notes: z.string().max(5000).optional().nullable(),
  decision: z.enum(["STRONG_HIRE", "HIRE", "NO_HIRE", "HOLD"]).optional().nullable(),
  participantIds: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { candidateId: idParam } = await params;
    const candidateId = Number(idParam);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const sessions = await db
      .select()
      .from(calibrationSessions)
      .where(
        and(
          eq(calibrationSessions.candidateId, candidateId),
          eq(calibrationSessions.orgId, session.orgId)
        )
      )
      .orderBy(desc(calibrationSessions.createdAt));

    return ok(sessions);
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { candidateId: idParam } = await params;
    const candidateId = Number(idParam);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found.", 404);

    const body = await parseBody(req, createSchema);

    const [created] = await db
      .insert(calibrationSessions)
      .values({
        orgId: session.orgId,
        candidateId,
        jobPostingId: body.jobPostingId,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        status: body.scheduledAt ? "scheduled" : "pending",
        participantIds: body.participantIds,
        notes: body.notes ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    const { candidateId: idParam } = await params;
    const candidateId = Number(idParam);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const body = await parseBody(req, updateSchema);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.scheduledAt !== undefined) updates.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.decision !== undefined) updates.decision = body.decision;
    if (body.participantIds !== undefined) updates.participantIds = body.participantIds;

    const [updated] = await db
      .update(calibrationSessions)
      .set(updates)
      .where(
        and(
          eq(calibrationSessions.id, body.id),
          eq(calibrationSessions.orgId, session.orgId),
          eq(calibrationSessions.candidateId, candidateId)
        )
      )
      .returning();

    if (!updated) return err("Session not found.", 404);

    return ok(updated);
  });
}
