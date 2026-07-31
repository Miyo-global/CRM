import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/db/audit";
import type { NextRequest } from "next/server";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  remarks: z.string().optional(),
});

type RouteParams = { params: Promise<{ candidateId: string; offerId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    if (session.user.role !== "CEO") {
      return err("Only CEO can review offers.", 403);
    }

    const { candidateId: cid, offerId: oid } = await params;
    const candidateId = Number(cid);
    const offerId = Number(oid);
    if (!Number.isFinite(candidateId) || !Number.isFinite(offerId)) {
      return err("Invalid ID", 400);
    }

    const existing = await db.query.candidateOffers.findFirst({
      where: and(
        eq(candidateOffers.id, offerId),
        eq(candidateOffers.candidateId, candidateId),
        eq(candidateOffers.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Offer not found", 404);
    if (existing.offerStatus !== "PENDING_CEO") {
      return err("Offer is not pending CEO review.", 400);
    }

    const body = reviewSchema.parse(await req.json());

    if (body.decision === "reject" && !body.remarks?.trim()) {
      return err("Remarks are required when rejecting.", 400);
    }

    const newStatus = body.decision === "approve" ? "CEO_APPROVED" : "CEO_REJECTED";

    await db
      .update(candidateOffers)
      .set({
        offerStatus: newStatus,
        ceoReviewedBy: session.user.id,
        ceoReviewedAt: new Date(),
        ceoRemarks: body.remarks?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(candidateOffers.id, offerId));

    void writeAuditLog({
      action: body.decision === "approve" ? "OFFER_CEO_APPROVED" : "OFFER_CEO_REJECTED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(offerId),
      targetType: "candidate_offer",
      metadata: { candidateId, remarks: body.remarks },
    }).catch(() => undefined);

    return ok({ success: true });
  });
}
