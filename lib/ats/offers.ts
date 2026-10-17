import "server-only";

import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";

import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { atsEmailLog, candidateOffers, candidates, jobPostings } from "@/lib/db/schema";
import { hashToken } from "@/lib/crypto-core";
import { sendTemplateEmail } from "@/lib/email/sender";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";
import { formatIST } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

/**
 * MIYO-0662: the candidate's link. Only the hash is stored, so a leaked
 * database row cannot be used to accept an offer; the raw token exists
 * once, in the email.
 */
export function newOfferToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function money(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "not stated";
  return `${CURRENCY_SYMBOL}${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** The offer behind a token, or null when it is unknown or stale. */
export async function offerByToken(token: string) {
  const rows = await db
    .select({
      offer: candidateOffers,
      candidateFirstName: candidates.firstName,
      candidateLastName: candidates.lastName,
      candidateEmail: candidates.email,
      jobTitle: jobPostings.title,
      jobLocation: jobPostings.location,
    })
    .from(candidateOffers)
    .innerJoin(candidates, eq(candidates.id, candidateOffers.candidateId))
    .leftJoin(jobPostings, eq(jobPostings.id, candidateOffers.jobPostingId))
    .where(eq(candidateOffers.tokenHash, hashToken(token)))
    .limit(1);

  const found = rows[0];
  if (!found) return null;

  const expired =
    found.offer.acceptanceTokenExpiresAt !== null &&
    found.offer.acceptanceTokenExpiresAt.getTime() < Date.now();

  return { ...found, expired };
}

/** MIYO-0661: send the offer to the candidate. */
export async function sendOfferEmail(params: {
  orgId: string;
  offerId: number;
  token: string;
  signatoryName: string;
}) {
  const rows = await db
    .select({
      offer: candidateOffers,
      candidateId: candidates.id,
      firstName: candidates.firstName,
      email: candidates.email,
      jobTitle: jobPostings.title,
      jobLocation: jobPostings.location,
    })
    .from(candidateOffers)
    .innerJoin(candidates, eq(candidates.id, candidateOffers.candidateId))
    .leftJoin(jobPostings, eq(jobPostings.id, candidateOffers.jobPostingId))
    .where(
      and(eq(candidateOffers.id, params.offerId), eq(candidateOffers.orgId, params.orgId)),
    )
    .limit(1);

  const found = rows[0];
  if (!found) throw new Error("Offer not found");

  await sendTemplateEmail("ats-offer", {
    to: found.email,
    vars: {
      first_name: found.firstName,
      job_title: found.jobTitle ?? found.offer.offeredDesignation ?? "the role",
      job_location: found.jobLocation ?? "not stated",
      department: found.offer.offeredDesignation ?? "not stated",
      monthly_ctc: money(found.offer.offeredSalary),
      joining_date: found.offer.joiningDate ?? "to be agreed",
      respond_by: found.offer.validUntil ?? "soon",
      signatory_name: params.signatoryName,
      offer_url: `${appUrl}/offer/${params.token}`,
      privacy_url: `${appUrl}/privacy`,
      withdraw_url: `${appUrl}/careers`,
    },
  });

  await db
    .insert(atsEmailLog)
    .values({
      orgId: params.orgId,
      candidateId: found.candidateId,
      templateId: "ats-offer",
      toEmail: found.email,
      status: "sent",
    })
    .catch((error) => logger.error("ATS email log failed", { offerId: params.offerId, error }));
}

/** MIYO-0662: tell HR what the candidate decided. */
export async function sendOfferResponseEmail(params: {
  orgId: string;
  candidateId: number;
  candidateName: string;
  jobTitle: string;
  decision: "accepted" | "declined";
  note: string;
  hrEmails: string[];
}) {
  if (params.hrEmails.length === 0) return;

  await sendTemplateEmail("ats-offer-response-hr", {
    to: params.hrEmails,
    category: "hr",
    vars: {
      candidate_name: params.candidateName,
      job_title: params.jobTitle,
      decision: params.decision,
      decision_note: params.note || "none",
      candidate_url: `${appUrl}/ats/candidates/${params.candidateId}`,
      responded_on: `${formatIST(new Date())} IST`,
    },
  });
}
