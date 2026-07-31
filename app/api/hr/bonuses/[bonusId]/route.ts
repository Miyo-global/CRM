import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { bonuses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { BONUS_MANAGE_ROLES } from "@/lib/constants/hr";
import { deliverBonusPaidNotifications } from "@/lib/hr/send-bonus-paid-notifications";
import { logger } from "@/lib/logger";
import { z, ZodError } from "zod";
import type { NextRequest } from "next/server";

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
});

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
      if (existing.status === "PAID") return err("Bonus has already been paid.", 400);
      if (existing.status === "REJECTED") return err("Bonus has already been rejected.", 400);

      const now = new Date();
      const [updated] = await db
        .update(bonuses)
        .set({
          status: body.status,
          approvedBy: session.user.id,
          approvedAt: now,
        })
        .where(eq(bonuses.id, bonusId))
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
