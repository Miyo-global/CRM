import { and, eq, gte, inArray } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";
import { restoreApprovedLeaveBalance } from "@/lib/hr/deduct-leave-balance";
import { db } from "@/lib/db";
import { leaveRequests, passwordResetTokens, users, userSessions } from "@/lib/db/schema";
import { invalidateUserSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Long enough to outlive any JWT still in circulation (session maxAge). */
const REVOKE_TTL_SECONDS = 8 * 60 * 60;

/**
 * R3-SA-01: everything that ends a person's access, run inside the caller's
 * transaction: account off, Portal Access off, every session row revoked, any
 * outstanding reset link dropped, pending leave requests and approved leave
 * from today on cancelled (balance restored).
 * Expense / reimbursement claims stay open on purpose: they are money owed and
 * settle through Full & Final. Call `afterAccountsDeactivated` once the
 * transaction has committed.
 */
export async function deactivateAccountsInTx(tx: Tx, userIds: string[]): Promise<{ sessionIds: string[] }> {
  if (userIds.length === 0) return { sessionIds: [] };

  const rows = await tx
    .update(users)
    .set({ isActive: false, hasDashboardAccess: false, updatedAt: new Date() })
    .where(inArray(users.id, userIds))
    .returning({ email: users.email });

  const sessions = await tx
    .update(userSessions)
    .set({ isRevoked: true })
    .where(and(inArray(userSessions.userId, userIds), eq(userSessions.isRevoked, false)))
    .returning({ id: userSessions.id });

  const emails = rows.map((r) => r.email.toLowerCase());
  if (emails.length > 0) {
    await tx.delete(passwordResetTokens).where(inArray(passwordResetTokens.email, emails));
  }

  await tx
    .update(leaveRequests)
    .set({ status: "CANCELLED" })
    .where(and(inArray(leaveRequests.userId, userIds), eq(leaveRequests.status, "PENDING")));

  // Approved leave that has not started yet will never be taken: cancel it and
  // give the days back so the F&F balance is right (and it stops showing on
  // Who's Out / the calendar).
  const futureLeave = await tx
    .update(leaveRequests)
    .set({ status: "CANCELLED" })
    .where(
      and(
        inArray(leaveRequests.userId, userIds),
        eq(leaveRequests.status, "APPROVED"),
        gte(leaveRequests.startDate, getTodayString()),
      ),
    )
    .returning();
  for (const leave of futureLeave) await restoreApprovedLeaveBalance(tx, leave);

  return { sessionIds: sessions.map((s) => s.id) };
}

/**
 * Post-commit half: flag the revoked sessions in Redis so every instance sees
 * them at once, and drop the cached user so the next jwt() / withAuth read
 * picks up isActive=false.
 */
export async function afterAccountsDeactivated(userIds: string[], sessionIds: string[]): Promise<void> {
  if (redis) {
    await Promise.all(
      sessionIds.map((id) =>
        redis!
          .set(`revoked:session:${id}`, true, { ex: REVOKE_TTL_SECONDS })
          .catch((e) => logger.error("deactivate: redis revoke key failed", { sessionId: id, error: e })),
      ),
    );
  }
  await Promise.all(
    userIds.map((id) =>
      invalidateUserSession(id).catch((e) => logger.error("deactivate: session cache drop failed", { userId: id, error: e })),
    ),
  );
}
