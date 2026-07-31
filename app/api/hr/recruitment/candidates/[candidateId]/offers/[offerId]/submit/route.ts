import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import { HR_ROLES } from "@/lib/constants/roles";
import { OFFER_SUBMIT_STATUSES } from "@/lib/constants/candidate-offers";
import type { NextRequest } from "next/server";

type RouteParams = { params: Promise<{ candidateId: string; offerId: string }> };

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Only HR can submit offers for CEO approval.", 403);
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

    const status = existing.offerStatus as (typeof OFFER_SUBMIT_STATUSES)[number];
    if (!OFFER_SUBMIT_STATUSES.includes(status)) {
      return err("Only draft or CEO-rejected offers can be submitted.", 400);
    }

    if (!existing.offerLetterUrl?.trim()) {
      return err("Generate or attach an offer letter before submitting for CEO approval.", 400);
    }

    const previousStatus = existing.offerStatus;

    await db
      .update(candidateOffers)
      .set({
        offerStatus: "PENDING_CEO",
        submittedForCeoAt: new Date(),
        ceoRemarks: null,
        ceoReviewedBy: null,
        ceoReviewedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(candidateOffers.id, offerId));

    void writeAuditLog({
      action: "OFFER_SUBMITTED_FOR_CEO",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(offerId),
      targetType: "candidate_offer",
      metadata: { from: previousStatus, to: "PENDING_CEO", candidateId },
    }).catch(() => undefined);

    return ok({ success: true });
  });
}
