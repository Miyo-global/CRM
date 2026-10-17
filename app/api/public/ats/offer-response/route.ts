import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z, ZodError } from "zod";

import { db } from "@/lib/db";
import {
  atsActivity,
  candidateApplications,
  candidateOffers,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { checkRateLimit } from "@/lib/rate-limit";
import { offerByToken, sendOfferResponseEmail } from "@/lib/ats/offers";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  token: z.string().min(10).max(200),
  decision: z.enum(["accept", "decline"]),
  /** Typed name stands in for a signature on acceptance. */
  signedName: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(1000).optional(),
});

/**
 * MIYO-0662: the candidate's answer. Public, so it is rate limited and
 * identified only by the token, whose hash is what the row holds.
 */
export async function POST(req: NextRequest) {
  if (!ATS_MODULE_ENABLED) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const limit = await checkRateLimit("ats-apply", `offer:${ip}`);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    const found = await offerByToken(body.token);
    if (!found) return NextResponse.json({ error: "This link is not valid." }, { status: 404 });
    if (found.expired) {
      return NextResponse.json({ error: "This offer has expired." }, { status: 410 });
    }
    if (found.offer.respondedAt) {
      return NextResponse.json({ error: "You have already answered." }, { status: 409 });
    }
    if (body.decision === "accept" && !body.signedName?.trim()) {
      return NextResponse.json({ error: "Type your name to accept." }, { status: 400 });
    }

    const accepted = body.decision === "accept";

    await db
      .update(candidateOffers)
      .set({
        offerStatus: accepted ? "ACCEPTED" : "DECLINED",
        respondedAt: new Date(),
        declineReason: accepted ? null : body.reason ?? null,
        notes: accepted
          ? [found.offer.notes, `Accepted by ${body.signedName?.trim()}`]
              .filter(Boolean)
              .join("\n")
          : found.offer.notes,
        // The link is spent either way.
        tokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(candidateOffers.id, found.offer.id));

    // Accepting moves the application to the offer-accepted state; the hire
    // itself is a separate, deliberate step (MIYO-0663).
    if (accepted && found.offer.jobPostingId) {
      await db
        .update(candidateApplications)
        .set({ status: "ACCEPTED", updatedAt: new Date() })
        .where(
          and(
            eq(candidateApplications.candidateId, found.offer.candidateId),
            eq(candidateApplications.jobPostingId, found.offer.jobPostingId),
          ),
        );
    }

    await db.insert(atsActivity).values({
      orgId: found.offer.orgId,
      candidateId: found.offer.candidateId,
      type: accepted ? "offer_accepted" : "offer_declined",
      data: { offerId: found.offer.id, reason: body.reason },
    });

    try {
      const hr = await db
        .select({ email: users.email })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(
          and(
            eq(organizationMembers.orgId, found.offer.orgId),
            inArray(organizationMembers.role, [...ADMIN_ROLES]),
          ),
        );

      await sendOfferResponseEmail({
        orgId: found.offer.orgId,
        candidateId: found.offer.candidateId,
        candidateName: `${found.candidateFirstName} ${found.candidateLastName}`.trim(),
        jobTitle: found.jobTitle ?? found.offer.offeredDesignation ?? "the role",
        decision: accepted ? "accepted" : "declined",
        note: accepted ? (body.signedName ?? "") : (body.reason ?? ""),
        hrEmails: hr.map((h) => h.email),
      });
    } catch (error) {
      logger.error("Offer response notification failed", { offerId: found.offer.id, error });
    }

    return NextResponse.json({ ok: true, decision: body.decision });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Check the form." }, { status: 400 });
    }
    logger.error("Offer response failed", { error: e });
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
