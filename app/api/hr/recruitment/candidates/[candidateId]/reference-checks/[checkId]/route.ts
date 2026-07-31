import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateReferenceChecks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "DECLINED"]).optional(),
  outcome: z.string().max(500).nullable().optional(),
  notes: z.string().nullable().optional(),
  contactedAt: z.string().datetime().optional(),
  referenceDesignation: z.string().max(200).nullable().optional(),
  referenceCompany: z.string().max(200).nullable().optional(),
  referenceEmail: z.string().email().nullable().optional(),
  referencePhone: z.string().max(30).nullable().optional(),
});

type RouteParams = { params: Promise<{ candidateId: string; checkId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: cid, checkId: rid } = await params;
    const candidateId = Number(cid);
    const checkId = Number(rid);
    if (!Number.isFinite(candidateId) || !Number.isFinite(checkId)) {
      return err("Invalid ID", 400);
    }

    const existing = await db.query.candidateReferenceChecks.findFirst({
      where: and(
        eq(candidateReferenceChecks.id, checkId),
        eq(candidateReferenceChecks.candidateId, candidateId),
        eq(candidateReferenceChecks.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Reference check not found", 404);

    const input = await parseBody(req, updateSchema);
    const updateData: Record<string, unknown> = { ...input, updatedAt: new Date() };
    if (input.contactedAt) updateData.contactedAt = new Date(input.contactedAt);

    await db
      .update(candidateReferenceChecks)
      .set(updateData)
      .where(
        and(
          eq(candidateReferenceChecks.id, checkId),
          eq(candidateReferenceChecks.orgId, session.orgId)
        )
      );

    return ok({ success: true });
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: cid, checkId: rid } = await params;
    const candidateId = Number(cid);
    const checkId = Number(rid);
    if (!Number.isFinite(candidateId) || !Number.isFinite(checkId)) {
      return err("Invalid ID", 400);
    }

    const existing = await db.query.candidateReferenceChecks.findFirst({
      where: and(
        eq(candidateReferenceChecks.id, checkId),
        eq(candidateReferenceChecks.candidateId, candidateId),
        eq(candidateReferenceChecks.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Reference check not found", 404);

    await db
      .delete(candidateReferenceChecks)
      .where(
        and(
          eq(candidateReferenceChecks.id, checkId),
          eq(candidateReferenceChecks.orgId, session.orgId)
        )
      );

    return ok({ success: true });
  });
}
