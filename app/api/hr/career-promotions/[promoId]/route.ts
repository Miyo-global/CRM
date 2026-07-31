import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  careerPromotionRecommendations, careerPromotionHistory,
  employeeCareerProfiles, careerAuditLogs,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isAdminOrOwner } from "@/lib/constants/roles";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "WITHDRAWN"]),
  reviewNotes: z.string().max(2000).trim().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ promoId: string }> }) {
  return withAuth(async (session) => {
    const { promoId } = await params;
    const id = parseInt(promoId, 10);
    if (isNaN(id)) return err("Invalid id", 400);

    const [rec] = await db
      .select()
      .from(careerPromotionRecommendations)
      .where(and(eq(careerPromotionRecommendations.id, id), eq(careerPromotionRecommendations.orgId, session.orgId)));

    if (!rec) return err("Not found", 404);
    return ok(rec);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ promoId: string }> }) {
  return withAuth(async (session) => {
    const role = session.user.role as string;
    if (!isAdminOrOwner(role)) return err("Forbidden", 403);

    const { promoId } = await params;
    const id = parseInt(promoId, 10);
    if (isNaN(id)) return err("Invalid id", 400);

    const body = reviewSchema.parse(await req.json());

    const [rec] = await db
      .select()
      .from(careerPromotionRecommendations)
      .where(and(eq(careerPromotionRecommendations.id, id), eq(careerPromotionRecommendations.orgId, session.orgId)));

    if (!rec) return err("Not found", 404);
    if (rec.status !== "PENDING") return err("Only pending recommendations can be reviewed", 409);

    const [updated] = await db
      .update(careerPromotionRecommendations)
      .set({
        status: body.status,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: body.reviewNotes ?? null,
        effectiveDate: body.effectiveDate ?? rec.effectiveDate,
        updatedAt: new Date(),
      })
      .where(eq(careerPromotionRecommendations.id, id))
      .returning();

    if (body.status === "APPROVED") {
      await db.insert(careerPromotionHistory).values({
        orgId: session.orgId,
        employeeUserId: rec.employeeUserId,
        ladderId: rec.ladderId,
        fromLevel: rec.fromLevel,
        toLevel: rec.toLevel,
        promotedBy: session.user.id,
        recommendationId: id,
        effectiveDate: body.effectiveDate ?? rec.effectiveDate,
        notes: body.reviewNotes ?? null,
      });

      const [profile] = await db
        .select({ id: employeeCareerProfiles.id })
        .from(employeeCareerProfiles)
        .where(
          and(
            eq(employeeCareerProfiles.userId, rec.employeeUserId),
            eq(employeeCareerProfiles.orgId, session.orgId),
          ),
        );

      if (profile) {
        await db
          .update(employeeCareerProfiles)
          .set({
            currentLevel: rec.toLevel,
            ladderId: rec.ladderId,
            assignedBy: session.user.id,
            assignedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(employeeCareerProfiles.id, profile.id));
      }
    }

    await db.insert(careerAuditLogs).values({
      orgId: session.orgId,
      actorUserId: session.user.id,
      targetUserId: rec.employeeUserId,
      action: `${body.status}_PROMOTION`,
      entity: "career_promotion_recommendations",
      entityId: id,
      changes: { status: body.status, reviewNotes: body.reviewNotes },
    });

    return ok(updated);
  });
}
