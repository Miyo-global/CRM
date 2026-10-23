import { db } from "@/lib/db";
import { terminations } from "@/lib/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";

export const RESIGNATION_TERMINATION_REASON = "Resignation";

/**
 * Leaves out the termination records made from a resignation: the resignation
 * is already counted as the exit, so analytics must not count it twice.
 */
export const isNotFromResignation = sql`NOT (${terminations.reasons} @> ARRAY[${RESIGNATION_TERMINATION_REASON}]::text[])`;

/**
 * R2-TERM-05: an approved resignation becomes a termination record so HR
 * finishes the exit (deactivation, full-and-final, asset returns) from
 * /hr/termination like any other. The employee already got the approval
 * email, so the record starts at SENT and only needs "Complete". Skips a
 * person who already has an open or finished termination.
 */
export async function createTerminationFromResignation(
  resignation: {
    id: number;
    orgId: string;
    userId: string;
    reason: string | null;
    lastWorkingDate: string | null;
  },
  approverId: string,
): Promise<boolean> {
  const existing = await db.query.terminations.findFirst({
    where: and(
      eq(terminations.orgId, resignation.orgId),
      eq(terminations.userId, resignation.userId),
      ne(terminations.status, "REJECTED"),
    ),
    columns: { id: true },
  });
  if (existing) return false;

  const now = new Date();
  await db.insert(terminations).values({
    orgId: resignation.orgId,
    userId: resignation.userId,
    reasons: [RESIGNATION_TERMINATION_REASON],
    detailedExplanation: resignation.reason?.trim() || "Resignation approved.",
    effectiveDate: resignation.lastWorkingDate ?? getTodayString(),
    status: "SENT",
    initiatedBy: resignation.userId,
    ceoReviewedBy: approverId,
    ceoReviewedAt: now,
    emailSentAt: now,
    emailStatus: "resignation_approved",
    internalNotes: `Created from resignation #${resignation.id}.`,
  });
  return true;
}
