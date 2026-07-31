import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { candidateOffers, candidates, organizations, users, candidateSlaTracking } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { checkRateLimitRedis } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import { appUrl } from "@/lib/app-url";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";
import { notifyByRoles } from "@/server/actions/create-notification";
import {
  buildOfferResponseHrNotificationHtml,
  buildOfferDecisionConfirmationHtml,
} from "@/lib/email-templates/hr-recruitment";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;

  const offer = await db.query.candidateOffers.findFirst({
    where: eq(candidateOffers.acceptanceToken, token),
  });

  if (!offer) {
    return NextResponse.json({ error: "Offer link not found." }, { status: 404 });
  }

  if (offer.offerStatus === "ACCEPTED" || offer.offerStatus === "DECLINED") {
    return NextResponse.json(
      { error: "You have already responded to this offer.", alreadyResponded: true, decision: offer.offerStatus },
      { status: 410 }
    );
  }

  if (offer.offerStatus === "EXPIRED") {
    return NextResponse.json({ error: "This offer has expired." }, { status: 410 });
  }

  if (offer.offerStatus !== "SENT" && offer.offerStatus !== "VIEWED") {
    return NextResponse.json({ error: "This offer is not available." }, { status: 403 });
  }

  const tokenExpiry = offer.acceptanceTokenExpiresAt;
  if (tokenExpiry && new Date() > tokenExpiry) {
    return NextResponse.json({ error: "This offer link has expired." }, { status: 410 });
  }

  const [candidate, org] = await Promise.all([
    db.query.candidates.findFirst({
      where: eq(candidates.id, offer.candidateId),
      columns: { firstName: true, lastName: true, email: true },
    }),
    db.query.organizations.findFirst({
      where: eq(organizations.id, offer.orgId),
      columns: { name: true, logo: true },
    }),
  ]);

  if (offer.offerStatus === "SENT" && !offer.viewedAt) {
    await db
      .update(candidateOffers)
      .set({ viewedAt: new Date(), offerStatus: "VIEWED", updatedAt: new Date() })
      .where(eq(candidateOffers.id, offer.id));
  }

  return NextResponse.json({
    candidateName: candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate",
    orgName: org?.name ?? "Miyo Global",
    orgLogo: org?.logo ?? null,
    designation: offer.offeredDesignation ?? null,
    salary: offer.offeredSalary ?? null,
    joiningDate: offer.joiningDate ?? null,
    validUntil: offer.validUntil ?? null,
    offerLetterUrl: offer.offerLetterUrl ?? null,
    offerStatus: offer.offerStatus,
  });
}

const respondSchema = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const rl = await checkRateLimitRedis("public-offer-acceptance", getClientIp(req));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { token } = await params;

  let body: z.infer<typeof respondSchema>;
  try {
    body = respondSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const offer = await db.query.candidateOffers.findFirst({
    where: eq(candidateOffers.acceptanceToken, token),
  });

  if (!offer) {
    return NextResponse.json({ error: "Offer link not found." }, { status: 404 });
  }

  if (offer.offerStatus === "ACCEPTED" || offer.offerStatus === "DECLINED") {
    return NextResponse.json(
      { error: "You have already responded to this offer.", alreadyResponded: true },
      { status: 410 }
    );
  }

  if (offer.offerStatus === "EXPIRED") {
    return NextResponse.json({ error: "This offer has expired." }, { status: 410 });
  }

  const tokenExpiry = offer.acceptanceTokenExpiresAt;
  if (tokenExpiry && new Date() > tokenExpiry) {
    return NextResponse.json({ error: "This offer link has expired." }, { status: 410 });
  }

  if (offer.offerStatus !== "VIEWED" && offer.offerStatus !== "SENT") {
    return NextResponse.json({ error: "Offer is not in a state that can be responded to." }, { status: 409 });
  }

  const newCandidateStatus = body.decision === "ACCEPTED" ? "HIRED" : "REJECTED";

  await db.transaction(async (tx) => {
    await tx
      .update(candidateOffers)
      .set({
        offerStatus: body.decision,
        respondedAt: new Date(),
        notes: body.notes ?? offer.notes,
        updatedAt: new Date(),
      })
      .where(eq(candidateOffers.id, offer.id));

    await tx
      .update(candidates)
      .set({ status: newCandidateStatus, updatedAt: new Date() })
      .where(eq(candidates.id, offer.candidateId));

    await tx
      .update(candidateSlaTracking)
      .set({ status: "COMPLETE", updatedAt: new Date() })
      .where(eq(candidateSlaTracking.candidateId, offer.candidateId));
  });

  void (async () => {
    try {
      const [candidate, org] = await Promise.all([
        db.query.candidates.findFirst({
          where: eq(candidates.id, offer.candidateId),
          columns: { firstName: true, lastName: true, email: true },
        }),
        db.query.organizations.findFirst({
          where: eq(organizations.id, offer.orgId),
          columns: { name: true },
        }),
      ]);

      const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : "Candidate";
      const orgName = org?.name ?? "Miyo Global";
      const designation = offer.offeredDesignation ?? "the offered role";

      const hrUser = offer.offeredBy
        ? await db.query.users.findFirst({
            where: eq(users.id, offer.offeredBy),
            columns: { email: true, name: true },
          })
        : null;

      const candidateProfileUrl = `${appUrl}/hr/recruitment/candidates/${offer.candidateId}`;

      const hrEmails = [HR_NOTIFICATION_EMAIL];
      if (hrUser?.email && hrUser.email !== HR_NOTIFICATION_EMAIL) {
        hrEmails.push(hrUser.email);
      }

      await Promise.allSettled([
        candidate?.email
          ? sendEmail({
              to: candidate.email,
              bcc: HR_NOTIFICATION_EMAIL,
              ...buildOfferDecisionConfirmationHtml({
                candidateName,
                orgName,
                designation,
                decision: body.decision,
              }),
            })
          : Promise.resolve(),

        sendEmail({
          to: hrEmails,
          ...buildOfferResponseHrNotificationHtml({
            hrName: hrUser?.name ?? "Team",
            candidateName,
            designation,
            decision: body.decision,
            notes: body.notes ?? null,
            orgName,
            candidateProfileUrl,
          }),
        }),
      ]);

      void notifyByRoles(offer.orgId, ["CEO", "HR", "ADMIN", "BRANCH_HR"], {
        type: body.decision === "ACCEPTED" ? ("SUCCESS" as const) : ("INFO" as const),
        title: body.decision === "ACCEPTED" ? "Offer Accepted" : "Offer Declined",
        message:
          body.decision === "ACCEPTED"
            ? `${candidateName} has accepted the offer for ${designation}. Please initiate onboarding.`
            : `${candidateName} has declined the offer for ${designation}.`,
        link: `/hr/recruitment/candidates/${offer.candidateId}`,
        metadata: { candidateId: offer.candidateId, decision: body.decision },
      }).catch((e) => logger.error("Failed to send offer response in-app notification", e));
    } catch (e) {
      logger.error("Failed to send offer response notification emails", e);
    }
  })();

  return NextResponse.json({ success: true, decision: body.decision });
}
