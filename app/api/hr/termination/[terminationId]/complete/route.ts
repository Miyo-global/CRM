import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { terminations, fnfSettlements, assetReturns, assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import { createAuditLog } from "@/lib/audit-log";
import type { NextRequest } from "next/server";
import { invalidateHrDashboardCache } from "@/lib/hr-cache";
import { deactivateAccountsInTx, afterAccountsDeactivated } from "@/lib/hr/deactivate-account";
import { getTodayString } from "@/lib/date-utils";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    // R2-TERM-01: Admins start terminations, so they run the HR steps too.
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only HR or an Admin can complete terminations.", 403);
    }

    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const existing = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!existing) return err("Termination not found.", 404);
    if (existing.status !== "SENT") return err("Termination letter must be sent first.", 400);

    const assignedAssets = await db.query.assets.findMany({
      where: and(
        eq(assets.orgId, session.orgId),
        eq(assets.assignedTo, existing.userId),
        eq(assets.status, "ASSIGNED")
      ),
    });

    // R3-SA-09: a termination effective in the future is completed now (F&F,
    // asset returns) but the account stays open until the effective date; the
    // daily deactivate-exited-employees job closes it then.
    const deactivateNow = String(existing.effectiveDate).slice(0, 10) <= getTodayString();

    const { sessionIds } = await db.transaction(async (tx) => {
      await tx.update(terminations).set({
        status: "COMPLETED",
        updatedAt: new Date(),
      }).where(eq(terminations.id, terminationId));

      // R3-SA-01: account off, Portal Access off, sessions revoked, one commit.
      const revoked = deactivateNow
        ? await deactivateAccountsInTx(tx, [existing.userId])
        : { sessionIds: [] };

      // fnf_settlements has no unique key, so a resignation approved through
      // the exit flow (which opens its own F&F) must not get a second one.
      const existingFnf = await tx.query.fnfSettlements.findFirst({
        where: and(eq(fnfSettlements.orgId, session.orgId), eq(fnfSettlements.userId, existing.userId)),
        columns: { id: true },
      });
      if (!existingFnf) {
        await tx.insert(fnfSettlements).values({
          orgId: session.orgId,
          userId: existing.userId,
          status: "DRAFT",
        });
      }

      if (assignedAssets.length > 0) {
        const existingReturns = await tx.query.assetReturns.findMany({
          where: and(
            eq(assetReturns.orgId, session.orgId),
            eq(assetReturns.userId, existing.userId)
          ),
        });
        const existingAssetIds = new Set(existingReturns.map((r) => r.assetId));
        const newReturns = assignedAssets.filter((asset) => !existingAssetIds.has(asset.id));

        if (newReturns.length > 0) {
          await tx.insert(assetReturns).values(
            newReturns.map((asset) => ({
              orgId: session.orgId,
              userId: existing.userId,
              assetId: asset.id,
              assetName: asset.name,
              status: "PENDING",
            }))
          );
        }
      }
      return revoked;
    });

    // A terminated account must not keep working off an unexpired JWT.
    if (deactivateNow) await afterAccountsDeactivated([existing.userId], sessionIds);
    await invalidateHrDashboardCache(session.orgId);

    void writeAuditLog({
      action: "TERMINATION_COMPLETED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(terminationId),
      targetType: "termination",
      metadata: {
        employeeId: existing.userId,
        userDeactivated: deactivateNow,
        effectiveDate: existing.effectiveDate,
        fnfInitiated: true,
        assetsToReturn: assignedAssets.length,
      },
    }).catch(() => undefined);

    // R3-ADM-12: the account closing is its own event, findable by the user.
    if (deactivateNow) {
      void createAuditLog({
        action: "user.deactivated",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: existing.userId,
        targetType: "user",
        metadata: {
          via: "termination",
          terminationId,
          changes: { isActive: { from: true, to: false }, hasDashboardAccess: { from: true, to: false } },
          sessionsRevoked: sessionIds.length,
        },
      }).catch(() => undefined);
    }

    return ok({ success: true, deactivated: deactivateNow, effectiveDate: existing.effectiveDate });
  });
}
