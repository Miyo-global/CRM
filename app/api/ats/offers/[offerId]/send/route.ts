import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { withRoles, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsActivity, candidateOffers } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { newOfferToken, sendOfferEmail } from "@/lib/ats/offers";
import { createAuditLog } from "@/lib/audit-log";

/**
 * MIYO-0661: send the offer. An offer waiting on CEO approval does not go
 * out, and the link is minted here so only the hash is ever stored.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const offerId = Number((await params).offerId);
    if (!Number.isInteger(offerId)) return err("Invalid offer ID.", 400);

    const offer = await db.query.candidateOffers.findFirst({
      where: and(eq(candidateOffers.id, offerId), eq(candidateOffers.orgId, session.orgId)),
    });
    if (!offer) return err("Offer not found.", 404);
    if (offer.approvalStatus === "PENDING") {
      return err("This offer is waiting for approval.", 409);
    }
    if (offer.offerStatus === "ACCEPTED" || offer.offerStatus === "DECLINED") {
      return err("The candidate has already answered this offer.", 409);
    }

    const { token, tokenHash } = newOfferToken();
    const expiresAt = offer.validUntil
      ? new Date(`${offer.validUntil}T23:59:59+05:30`)
      : new Date(Date.now() + 14 * 86_400_000);

    await db
      .update(candidateOffers)
      .set({
        tokenHash,
        acceptanceToken: null,
        acceptanceTokenExpiresAt: expiresAt,
        offerStatus: "SENT",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(candidateOffers.id, offerId));

    await sendOfferEmail({
      orgId: session.orgId,
      offerId,
      token,
      signatoryName: session.user.name ?? "Miyo Global",
    });

    await db.insert(atsActivity).values({
      orgId: session.orgId,
      candidateId: offer.candidateId,
      actorId: session.user.id,
      type: "offer_sent",
      data: { offerId, expiresAt: expiresAt.toISOString() },
    });

    await createAuditLog({
      action: "ats.offer_sent",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(offerId),
      targetType: "candidate_offer",
      metadata: { candidateId: offer.candidateId, expiresAt: expiresAt.toISOString() },
    });

    return ok({ sent: true, expiresAt });
  }, req);
}
