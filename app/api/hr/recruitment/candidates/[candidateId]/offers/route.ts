import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers, candidates, jobPostings } from "@/lib/db/schema";
import { eq, and, desc, notInArray } from "drizzle-orm";
import { z } from "zod";
import { RECRUITMENT_HR_ROLES } from "@/lib/constants/roles";

type RouteParams = { params: Promise<{ candidateId: string }> };

const HR_ROLES = RECRUITMENT_HR_ROLES;

const createOfferSchema = z
  .object({
    jobPostingId: z.number().int().positive().optional(),
    offeredSalary: z.number().positive()
      .min(1000, "Salary must be at least 1,000")
      .max(100_000_000, "Salary exceeds maximum allowed")
      .optional(),
    offeredDesignation: z.string().trim().min(1).max(200).optional(),
    joiningDate: z.string().date().optional(),
    offerLetterUrl: z.string().url("Must be a valid URL").max(500).optional(),
    validUntil: z.string().date().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((d, ctx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (d.joiningDate) {
      if (new Date(d.joiningDate) < today) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Joining date must be today or in the future", path: ["joiningDate"] });
      }
    }
    if (d.validUntil) {
      if (new Date(d.validUntil) < today) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Offer expiry date must be today or in the future", path: ["validUntil"] });
      }
      if (d.joiningDate && new Date(d.validUntil) > new Date(d.joiningDate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Offer expiry date must be on or before the joining date", path: ["validUntil"] });
      }
    }
  });

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!Number.isFinite(candidateId)) return err("Invalid candidate ID", 400);

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found", 404);

    const offers = await db.query.candidateOffers.findMany({
      where: and(
        eq(candidateOffers.candidateId, candidateId),
        eq(candidateOffers.orgId, session.orgId),
      ),
      orderBy: [desc(candidateOffers.createdAt)],
    });

    return ok(offers);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!Number.isFinite(candidateId)) return err("Invalid candidate ID", 400);

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    const input = await parseBody(req, createOfferSchema);

    if (input.jobPostingId) {
      const job = await db.query.jobPostings.findFirst({
        where: and(eq(jobPostings.id, input.jobPostingId), eq(jobPostings.orgId, session.orgId)),
        columns: { id: true },
      });
      if (!job) return err("Job posting not found.", 404);
    }

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found", 404);

    const existingActiveOffer = await db.query.candidateOffers.findFirst({
      where: and(
        eq(candidateOffers.candidateId, candidateId),
        eq(candidateOffers.orgId, session.orgId),
        notInArray(candidateOffers.offerStatus, ["DECLINED", "EXPIRED"]),
      ),
      columns: { id: true },
    });
    if (existingActiveOffer) {
      return err("An active offer already exists for this candidate", 409);
    }

    const [offer] = await db
      .insert(candidateOffers)
      .values({
        orgId: session.orgId,
        candidateId,
        offeredBy: session.user.id,
        jobPostingId: input.jobPostingId,
        offeredSalary: input.offeredSalary?.toString(),
        offeredDesignation: input.offeredDesignation,
        joiningDate: input.joiningDate,
        offerLetterUrl: input.offerLetterUrl,
        validUntil: input.validUntil,
        notes: input.notes,
      })
      .returning();

    return ok(offer, 201);
  });
}
