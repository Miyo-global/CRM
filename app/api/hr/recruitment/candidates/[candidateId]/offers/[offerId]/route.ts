import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers, candidates, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import { randomBytes } from "crypto";
import { addDays } from "date-fns";
import { sendEmail } from "@/lib/email";
import { getCandidateOfferEmail } from "@/lib/email-templates/hr-recruitment";
import { appUrl } from "@/lib/app-url";
import { RECRUITMENT_HR_ROLES } from "@/lib/constants/roles";
import {
  PATCH_OFFER_TRANSITIONS,
  OFFER_EDITABLE_STATUSES,
  type CandidateOfferStatus,
} from "@/lib/constants/candidate-offers";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

type RouteParams = { params: Promise<{ candidateId: string; offerId: string }> };

const HR_ROLES = RECRUITMENT_HR_ROLES;

const PATCHABLE_OFFER_STATUSES = [
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "COUNTERED",
  "EXPIRED",
] as const;

const updateOfferSchema = z.object({
  offerStatus: z.enum(PATCHABLE_OFFER_STATUSES).optional(),
  offeredSalary: z.number().positive().optional(),
  offeredDesignation: z.string().min(1).optional(),
  joiningDate: z.string().optional(),
  offerLetterUrl: z.string().url().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  sentAt: z.string().datetime().optional(),
  viewedAt: z.string().datetime().optional(),
  respondedAt: z.string().datetime().optional(),
});

const FIELD_KEYS = [
  "offeredSalary",
  "offeredDesignation",
  "joiningDate",
  "offerLetterUrl",
  "validUntil",
  "notes",
] as const;

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: cid, offerId: oid } = await params;
    const candidateId = Number(cid);
    const offerId = Number(oid);
    if (!Number.isFinite(candidateId) || !Number.isFinite(offerId)) return err("Invalid ID", 400);

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    const input = await parseBody(req, updateOfferSchema);

    const existing = await db.query.candidateOffers.findFirst({
      where: and(
        eq(candidateOffers.id, offerId),
        eq(candidateOffers.candidateId, candidateId),
        eq(candidateOffers.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Offer not found", 404);

    const currentStatus = (existing.offerStatus ?? "DRAFT") as CandidateOfferStatus;

    const hasFieldEdits = FIELD_KEYS.some((key) => input[key] !== undefined);
    if (hasFieldEdits && !OFFER_EDITABLE_STATUSES.includes(currentStatus)) {
      return err("Offer details can only be edited while in draft or CEO-rejected status.", 400);
    }

    if (input.offerStatus !== undefined && input.offerStatus !== existing.offerStatus) {
      if (currentStatus === "DRAFT" || currentStatus === "PENDING_CEO" || currentStatus === "CEO_REJECTED") {
        return err(
          `Cannot transition offer from ${currentStatus} to ${input.offerStatus} via this endpoint.`,
          400,
        );
      }

      const allowed = PATCH_OFFER_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(input.offerStatus)) {
        return err(
          `Cannot transition offer from ${currentStatus} to ${input.offerStatus}.`,
          400,
        );
      }
    }

    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (input.offerStatus !== undefined) {
      updateData.offerStatus = input.offerStatus;
      if (input.offerStatus === "SENT" && !input.sentAt) updateData.sentAt = now;
      if (input.offerStatus === "VIEWED" && !input.viewedAt) updateData.viewedAt = now;
      if (["ACCEPTED", "DECLINED", "COUNTERED"].includes(input.offerStatus) && !input.respondedAt) {
        updateData.respondedAt = now;
      }
    }
    if (input.offeredSalary !== undefined) updateData.offeredSalary = String(input.offeredSalary);
    if (input.offeredDesignation !== undefined) updateData.offeredDesignation = input.offeredDesignation;
    if (input.joiningDate !== undefined) updateData.joiningDate = input.joiningDate;
    if (input.offerLetterUrl !== undefined) updateData.offerLetterUrl = input.offerLetterUrl;
    if (input.validUntil !== undefined) updateData.validUntil = input.validUntil;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.sentAt !== undefined) updateData.sentAt = new Date(input.sentAt);
    if (input.viewedAt !== undefined) updateData.viewedAt = new Date(input.viewedAt);
    if (input.respondedAt !== undefined) updateData.respondedAt = new Date(input.respondedAt);

    const [updated] = await db
      .update(candidateOffers)
      .set(updateData)
      .where(eq(candidateOffers.id, offerId))
      .returning();

    if (input.offerStatus === "SENT" && existing.offerStatus !== "SENT") {
      const token = randomBytes(32).toString("hex");
      const tokenExpiry = existing.validUntil
        ? new Date(existing.validUntil)
        : addDays(new Date(), 7);

      await db
        .update(candidateOffers)
        .set({ acceptanceToken: token, acceptanceTokenExpiresAt: tokenExpiry, updatedAt: new Date() })
        .where(eq(candidateOffers.id, offerId));

      const [candidate, org] = await Promise.all([
        db.query.candidates.findFirst({
          where: eq(candidates.id, candidateId),
          columns: { firstName: true, lastName: true, email: true },
        }),
        db.query.organizations.findFirst({
          where: eq(organizations.id, session.orgId),
          columns: { name: true },
        }),
      ]);

      const deadlineStr = input.validUntil ?? existing.validUntil ?? null;
      if (candidate?.email) {
        const acceptanceLink = `${appUrl}/offer-acceptance/${token}`;
        void sendEmail({
          to: candidate.email,
          ...getCandidateOfferEmail({
            candidateName: `${candidate.firstName} ${candidate.lastName}`,
            jobTitle: existing.offeredDesignation ?? "the offered role",
            companyName: org?.name,
            designation: existing.offeredDesignation,
            salary: existing.offeredSalary ? String(existing.offeredSalary) : null,
            joiningDate: existing.joiningDate ?? null,
            validUntil: tokenExpiry.toLocaleDateString(DEFAULT_LOCALE, { day: "numeric", month: "long", year: "numeric" }),
            acceptanceLink,
          }),
        }).catch(() => {});

        if (deadlineStr) {
          const deadlineMs = new Date(deadlineStr).getTime();
          const reminderMs = deadlineMs - 24 * 60 * 60 * 1000;
          if (reminderMs > Date.now()) {
            void inngest.send({
              name: "hr/offer.deadline.reminder",
              data: {
                candidateId,
                candidateName: `${candidate.firstName} ${candidate.lastName}`,
                candidateEmail: candidate.email,
                deadline: deadlineStr,
                documentIds: [],
                orgId: session.orgId,
                acceptanceToken: token,
              },
              ts: reminderMs,
            }).catch(() => {});
          }
        }
      }
    }

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: cid, offerId: oid } = await params;
    const candidateId = Number(cid);
    const offerId = Number(oid);
    if (!Number.isFinite(candidateId) || !Number.isFinite(offerId)) return err("Invalid ID", 400);

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    const existing = await db.query.candidateOffers.findFirst({
      where: and(
        eq(candidateOffers.id, offerId),
        eq(candidateOffers.candidateId, candidateId),
        eq(candidateOffers.orgId, session.orgId),
      ),
      columns: { id: true },
    });
    if (!existing) return err("Offer not found", 404);

    await db.delete(candidateOffers).where(eq(candidateOffers.id, offerId));

    return ok({ success: true });
  });
}
