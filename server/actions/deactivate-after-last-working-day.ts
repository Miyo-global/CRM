import "server-only";

import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, resignations, users, userSessions } from "@/lib/db/schema";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { getTodayString, formatDisplayDate, fromISODateString } from "@/lib/date-utils";
import { sendTemplateEmail } from "@/lib/email/sender";

/** Long enough to outlive any JWT still in circulation. */
const JWT_MAX_AGE_SECONDS = 8 * 60 * 60;

/** Resignations that are settled: the person is leaving on the stated date. */
const FINAL_STATUSES = ["CEO_APPROVED", "APPROVED", "IN_PROGRESS", "COMPLETED"] as const;

/**
 * MIYO-0145: close the accounts of people whose last working day has passed.
 *
 * Marking a resignation COMPLETED never deactivated the account, so leavers
 * kept signing in. This runs daily: anyone with a settled resignation whose
 * last working day is before today (IST) is deactivated, their sessions are
 * revoked, and they are told by email.
 */
export async function deactivateAfterLastWorkingDay(): Promise<{
  deactivated: number;
  userIds: string[];
}> {
  const today = getTodayString();

  const leavers = await db
    .select({
      userId: resignations.userId,
      orgId: resignations.orgId,
      lastWorkingDate: resignations.lastWorkingDate,
      email: users.email,
      firstName: users.firstName,
      name: users.name,
    })
    .from(resignations)
    .innerJoin(users, eq(users.id, resignations.userId))
    .where(
      and(
        inArray(resignations.status, [...FINAL_STATUSES]),
        isNotNull(resignations.lastWorkingDate),
        lt(resignations.lastWorkingDate, today),
        eq(users.isActive, true),
      ),
    );

  if (leavers.length === 0) return { deactivated: 0, userIds: [] };

  const userIds = [...new Set(leavers.map((l) => l.userId))];

  await db.update(users).set({ isActive: false }).where(inArray(users.id, userIds));

  // A deactivated account must not keep working off an unexpired JWT.
  const live = await db.query.userSessions.findMany({
    where: and(inArray(userSessions.userId, userIds), eq(userSessions.isRevoked, false)),
    columns: { id: true },
  });
  if (live.length > 0) {
    await db
      .update(userSessions)
      .set({ isRevoked: true })
      .where(inArray(userSessions.id, live.map((s) => s.id)));
    if (redis) {
      await Promise.all(
        live.map((s) =>
          redis!
            .set(`revoked:session:${s.id}`, true, { ex: JWT_MAX_AGE_SECONDS })
            .catch(() => undefined),
        ),
      );
    }
  }

  const orgIds = [...new Set(leavers.map((l) => l.orgId))];
  const orgRows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(inArray(organizations.id, orgIds));
  const orgName = new Map(orgRows.map((o) => [o.id, o.name]));

  for (const leaver of leavers) {
    // The work address is all we hold; MIYO-0158 adds the personal one.
    if (!leaver.email) continue;
    try {
      await sendTemplateEmail("auth-account-deactivated", {
        to: leaver.email,
        vars: {
          first_name: leaver.firstName ?? leaver.name ?? "there",
          org_name: orgName.get(leaver.orgId) ?? "Miyo Global",
          deactivated_on: formatDisplayDate(fromISODateString(today), {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        },
      });
    } catch (error) {
      logger.error("Deactivation email failed", { userId: leaver.userId, error });
    }
  }

  logger.info("Deactivated employees past their last working day", {
    count: userIds.length,
  });

  return { deactivated: userIds.length, userIds };
}
