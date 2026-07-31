

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const bgvSchema = z.object({
  bgvStatus: z.enum(["NOT_INITIATED", "INITIATED", "PENDING", "CLEARED", "FAILED"]),
  bgvAgency: z.string().max(200).optional(),
  bgvNotes: z.string().max(2000).optional(),
});

type RouteParams = { params: Promise<{ candidateId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden: HR role required", 403);
    }

    const { candidateId: cidParam } = await params;
    const candidateId = Number(cidParam);
    if (!candidateId) return err("Invalid candidate ID", 400);

    const body = await parseBody(req, bgvSchema);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found", 404);

    const now = new Date();
    const updateFields: Partial<typeof candidates.$inferInsert> = {
      bgvStatus: body.bgvStatus,
      updatedAt: now,
    };

    if (body.bgvAgency !== undefined) updateFields.bgvAgency = body.bgvAgency;
    if (body.bgvNotes !== undefined) updateFields.bgvNotes = body.bgvNotes;

    if (body.bgvStatus === "INITIATED" && candidate.bgvStatus === "NOT_INITIATED") {
      updateFields.bgvInitiatedAt = now;
    }
    if (body.bgvStatus === "CLEARED" || body.bgvStatus === "FAILED") {
      updateFields.bgvCompletedAt = now;
    }

    await db
      .update(candidates)
      .set(updateFields)
      .where(eq(candidates.id, candidateId));

    const updated = await db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId),
    });

    return ok(updated);
  });
}
