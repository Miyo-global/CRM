import "server-only";

import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, organizations, resignations, terminations, users } from "@/lib/db/schema";
import { deactivateAccountsInTx, afterAccountsDeactivated } from "@/lib/hr/deactivate-account";
import { logger } from "@/lib/logger";
import { getTodayString, formatDisplayDate, fromISODateString } from "@/lib/date-utils";
import { sendTemplateEmail } from "@/lib/email/sender";

/**
 * R3-SA-02: someone re-hired after leaving keeps the old exit record; the
 * "hr.employee_rehired" audit event marks the account as deliberately reopened.
 */
const notRehiredSince = (exitDate: typeof resignations.lastWorkingDate | typeof terminations.effectiveDate) =>
  sql`NOT EXISTS (SELECT 1 FROM ${auditLogs} WHERE ${auditLogs.action} = 'hr.employee_rehired' AND ${auditLogs.targetId} = ${users.id} AND ${auditLogs.createdAt} >= ${exitDate})`;

/** Resignations that are settled: the person is leaving on the stated date. */
const FINAL_STATUSES = ["CEO_APPROVED", "APPROVED", "IN_PROGRESS", "COMPLETED"] as const;

/**
 * MIYO-0145: close the accounts of people whose last working day has passed.
 *
 * Marking a resignation COMPLETED never deactivated the account, so leavers
 * kept signing in. This runs daily: anyone with a settled resignation whose
 * last working day is before today (IST) is deactivated, their sessions are
 * revoked, and they are told by email.
 *
 * R3-SA-09: a termination completed ahead of its effective date leaves the
 * account open; it is closed here once that date has passed.
 */
export async function deactivateAfterLastWorkingDay(): Promise<{
  deactivated: number;
  userIds: string[];
}> {
  const today = getTodayString();

  const leaverColumns = {
    email: users.email,
    personalEmail: users.personalEmail,
    firstName: users.firstName,
    name: users.name,
  };

  const resigned = await db
    .select({
      userId: resignations.userId,
      orgId: resignations.orgId,
      ...leaverColumns,
    })
    .from(resignations)
    .innerJoin(users, eq(users.id, resignations.userId))
    .where(
      and(
        inArray(resignations.status, [...FINAL_STATUSES]),
        isNotNull(resignations.lastWorkingDate),
        lt(resignations.lastWorkingDate, today),
        eq(users.isActive, true),
        notRehiredSince(resignations.lastWorkingDate),
      ),
    );

  const terminated = await db
    .select({
      userId: terminations.userId,
      orgId: terminations.orgId,
      ...leaverColumns,
    })
    .from(terminations)
    .innerJoin(users, eq(users.id, terminations.userId))
    .where(
      and(
        eq(terminations.status, "COMPLETED"),
        lt(terminations.effectiveDate, today),
        eq(users.isActive, true),
        notRehiredSince(terminations.effectiveDate),
      ),
    );

  const byUser = new Map([...resigned, ...terminated].map((l) => [l.userId, l]));
  const leavers = [...byUser.values()];
  if (leavers.length === 0) return { deactivated: 0, userIds: [] };

  const userIds = [...byUser.keys()];

  // A deactivated account must not keep working off an unexpired JWT: the
  // shared helper also turns Portal Access off and revokes every session.
  const { sessionIds } = await db.transaction((tx) => deactivateAccountsInTx(tx, userIds));
  await afterAccountsDeactivated(userIds, sessionIds);

  const orgIds = [...new Set(leavers.map((l) => l.orgId))];
  const orgRows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(inArray(organizations.id, orgIds));
  const orgName = new Map(orgRows.map((o) => [o.id, o.name]));

  for (const leaver of leavers) {
    // MIYO-0158: the work inbox is closing with the account, so prefer the
    // personal address.
    const to = leaver.personalEmail?.trim() || leaver.email;
    if (!to) continue;
    try {
      await sendTemplateEmail("auth-account-deactivated", {
        to,
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
