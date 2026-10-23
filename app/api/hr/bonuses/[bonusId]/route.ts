import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { bonuses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { BONUS_MANAGE_ROLES } from "@/lib/constants/hr";
import { deliverBonusPaidNotifications } from "@/lib/hr/send-bonus-paid-notifications";
import { bonusTransitionError } from "@/lib/hr/bonus-status";
import { createBonusBodySchema } from "@/lib/validations/bonus";
import { logger } from "@/lib/logger";
import { z, ZodError } from "zod";
import type { NextRequest } from "next/server";

// Either a status change, or (while pending) an edit of amount, type, reason.
const patchSchema = z.union([
  z.object({ status: z.enum(["APPROVED", "REJECTED", "PAID", "CANCELLED"]) }),
  z.object({
    amount: z.union([z.number(), z.string()]).optional(),
    type: z.string().optional(),
    reason: z.string().optional(),
  }).strict(),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bonusId: string }> },
) {
  return withRoles(BONUS_MANAGE_ROLES)(async (session) => {
    try {
      const { bonusId: id } = await params;
      const bonusId = Number(id);
      if (isNaN(bonusId)) return err("Invalid bonus ID.", 400);

      const body = await parseBody(req, patchSchema);

      const [existing] = await db
        .select()
        .from(bonuses)
        .where(and(eq(bonuses.id, bonusId), eq(bonuses.orgId, session.orgId)));

      if (!existing) return err("Bonus not found.", 404);

      if (!("status" in body)) {
        if ((existing.status ?? "PENDING") !== "PENDING") {
          return err("Only a pending bonus can be edited.", 400);
        }
        const edit = createBonusBodySchema.parse({
          userId: existing.userId,
          type: body.type ?? existing.type,
          amount: body.amount ?? existing.amount,
          reason: body.reason ?? existing.reason ?? undefined,
        });
        const [updated] = await db
          .update(bonuses)
          .set({ type: edit.type, amount: edit.amount.toString(), reason: edit.reason ?? null })
          .where(and(eq(bonuses.id, bonusId), eq(bonuses.orgId, session.orgId)))
          .returning();
        return ok(updated);
      }

      const transitionError = bonusTransitionError(existing.status, body.status);
      if (transitionError) return err(transitionError, 400);

      // approvedAt doubles as the paid date on My Bonuses; a cancel keeps the
      // last decision on record.
      const decided = body.status !== "CANCELLED";
      const [updated] = await db
        .update(bonuses)
        .set({
          status: body.status,
          ...(decided ? { approvedBy: session.user.id, approvedAt: new Date() } : {}),
        })
        .where(and(eq(bonuses.id, bonusId), eq(bonuses.orgId, session.orgId)))
        .returning();

      let notificationResult;
      if (body.status === "PAID") {
        try {
          notificationResult = await deliverBonusPaidNotifications({
            orgId: session.orgId,
            bonusId,
            markedPaidByUserId: session.user.id,
            markedPaidByName: session.user.name ?? "Administrator",
          });
        } catch (error) {
          logger.error("Bonus paid notifications failed", { bonusId, error });
        }
      }

      return ok({
        ...updated,
        ...(notificationResult
          ? {
              employeeEmailSent: notificationResult.employeeEmailSent,
              stakeholderEmailsSent: notificationResult.stakeholderEmailsSent,
            }
          : {}),
      });
    } catch (e) {
      if (e instanceof ZodError) {
        return err(e.issues[0]?.message ?? "Invalid bonus update.", 400);
      }
      throw e;
    }
  });
}
