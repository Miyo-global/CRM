import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateReferrals, candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { isRecruitmentHr } from "@/lib/constants/roles";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ candidateId: string }> };

const createSchema = z.object({
  referredBy: z.string().min(1),
  relationship: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  bonusEligible: z.boolean().default(true),
  bonusAmount: z.number().min(0).max(10000000).optional(),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  bonusEligible: z.boolean().optional(),
  bonusAmount: z.number().min(0).max(10000000).optional().nullable(),
  bonusPaidAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { candidateId: idParam } = await params;
    const candidateId = Number(idParam);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const referrals = await db
      .select()
      .from(candidateReferrals)
      .where(
        and(eq(candidateReferrals.candidateId, candidateId), eq(candidateReferrals.orgId, session.orgId))
      );

    return ok(referrals);
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    if (!isRecruitmentHr(session.user.role)) {
      return err("You do not have permission to manage referrals.", 403);
    }

    const { candidateId: idParam } = await params;
    const candidateId = Number(idParam);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found.", 404);

    const body = await parseBody(req, createSchema);

    const [created] = await db
      .insert(candidateReferrals)
      .values({
        orgId: session.orgId,
        candidateId,
        referredBy: body.referredBy,
        relationship: body.relationship ?? null,
        notes: body.notes ?? null,
        bonusEligible: body.bonusEligible,
        bonusAmount: body.bonusAmount ? String(body.bonusAmount) : null,
      })
      .returning();

    return ok(created, 201);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    if (!isRecruitmentHr(session.user.role)) {
      return err("You do not have permission to manage referrals.", 403);
    }

    const { candidateId: idParam } = await params;
    const candidateId = Number(idParam);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const body = await parseBody(req, updateSchema);

    const updates: Record<string, unknown> = {};
    if (body.bonusEligible !== undefined) updates.bonusEligible = body.bonusEligible;
    if (body.bonusAmount !== undefined) updates.bonusAmount = body.bonusAmount !== null ? String(body.bonusAmount) : null;
    if (body.bonusPaidAt !== undefined) updates.bonusPaidAt = body.bonusPaidAt ? new Date(body.bonusPaidAt) : null;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      return err("No fields provided to update.", 400);
    }

    const [updated] = await db
      .update(candidateReferrals)
      .set(updates)
      .where(
        and(
          eq(candidateReferrals.id, body.id),
          eq(candidateReferrals.orgId, session.orgId),
          eq(candidateReferrals.candidateId, candidateId)
        )
      )
      .returning();

    if (!updated) return err("Referral not found.", 404);

    return ok(updated);
  });
}
