import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  careerPromotionRecommendations, careerLadders, users, careerAuditLogs,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isAdminOrOwner } from "@/lib/constants/roles";

const createSchema = z.object({
  employeeUserId: z.string().min(1),
  ladderId: z.number().int().positive().optional().nullable(),
  fromLevel: z.number().int().positive().max(20).optional().nullable(),
  toLevel: z.number().int().positive().max(20),
  reason: z.string().max(2000).trim().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
}).superRefine((d, ctx) => {
  if (d.fromLevel !== null && d.fromLevel !== undefined && d.toLevel <= (d.fromLevel ?? 0)) {
    ctx.addIssue({ code: "custom", path: ["toLevel"], message: "Target level must be higher than current level" });
  }
});

export async function GET() {
  return withAuth(async (session) => {
    const role = session.user.role as string;

    const rows = await db
      .select({
        id: careerPromotionRecommendations.id,
        orgId: careerPromotionRecommendations.orgId,
        employeeUserId: careerPromotionRecommendations.employeeUserId,
        recommendedBy: careerPromotionRecommendations.recommendedBy,
        ladderId: careerPromotionRecommendations.ladderId,
        fromLevel: careerPromotionRecommendations.fromLevel,
        toLevel: careerPromotionRecommendations.toLevel,
        status: careerPromotionRecommendations.status,
        reason: careerPromotionRecommendations.reason,
        reviewedBy: careerPromotionRecommendations.reviewedBy,
        reviewedAt: careerPromotionRecommendations.reviewedAt,
        reviewNotes: careerPromotionRecommendations.reviewNotes,
        effectiveDate: careerPromotionRecommendations.effectiveDate,
        createdAt: careerPromotionRecommendations.createdAt,
        updatedAt: careerPromotionRecommendations.updatedAt,
        ladderTitle: careerLadders.title,
        employeeName: users.name,
      })
      .from(careerPromotionRecommendations)
      .leftJoin(careerLadders, eq(careerPromotionRecommendations.ladderId, careerLadders.id))
      .leftJoin(users, eq(careerPromotionRecommendations.employeeUserId, users.id))
      .where(
        isAdminOrOwner(role)
          ? eq(careerPromotionRecommendations.orgId, session.orgId)
          : eq(careerPromotionRecommendations.employeeUserId, session.user.id),
      )
      .orderBy(desc(careerPromotionRecommendations.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role as string;
    if (!isAdminOrOwner(role)) return err("Forbidden", 403);

    const body = createSchema.parse(await req.json());

    const pending = await db
      .select({ id: careerPromotionRecommendations.id })
      .from(careerPromotionRecommendations)
      .where(
        and(
          eq(careerPromotionRecommendations.employeeUserId, body.employeeUserId),
          eq(careerPromotionRecommendations.status, "PENDING"),
          eq(careerPromotionRecommendations.orgId, session.orgId),
        ),
      );

    if (pending.length > 0) return err("Employee already has a pending promotion recommendation", 409);

    const [rec] = await db
      .insert(careerPromotionRecommendations)
      .values({
        orgId: session.orgId,
        employeeUserId: body.employeeUserId,
        recommendedBy: session.user.id,
        ladderId: body.ladderId ?? null,
        fromLevel: body.fromLevel ?? null,
        toLevel: body.toLevel,
        reason: body.reason ?? null,
        effectiveDate: body.effectiveDate ?? null,
      })
      .returning();

    await db.insert(careerAuditLogs).values({
      orgId: session.orgId,
      actorUserId: session.user.id,
      targetUserId: body.employeeUserId,
      action: "CREATE_PROMOTION_RECOMMENDATION",
      entity: "career_promotion_recommendations",
      entityId: rec.id,
      changes: { toLevel: body.toLevel, fromLevel: body.fromLevel },
    });

    return ok(rec, 201);
  });
}
