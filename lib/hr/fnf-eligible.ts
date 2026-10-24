import "server-only";

import { and, desc, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { fnfSettlements, resignations, terminations } from "@/lib/db/schema";

/** Exits that are over or under way; a withdrawn, rejected or cancelled one is not. */
const DEAD_RESIGNATION = ["WITHDRAWN", "REJECTED"] as const;
const DEAD_TERMINATION = ["DRAFT", "REJECTED", "CANCELLED"] as const;

/**
 * Who a full & final settlement can be created for: someone with a live
 * resignation or termination and no settlement yet. Maps each user to the
 * resignation the settlement links to (null for a termination).
 */
export async function fnfEligibleUsers(orgId: string): Promise<Map<string, number | null>> {
  const [resigned, terminated, settled] = await Promise.all([
    db
      .select({ userId: resignations.userId, id: resignations.id })
      .from(resignations)
      .where(and(eq(resignations.orgId, orgId), notInArray(resignations.status, [...DEAD_RESIGNATION])))
      .orderBy(desc(resignations.id)),
    db
      .select({ userId: terminations.userId })
      .from(terminations)
      .where(and(eq(terminations.orgId, orgId), notInArray(terminations.status, [...DEAD_TERMINATION]))),
    db.select({ userId: fnfSettlements.userId }).from(fnfSettlements).where(eq(fnfSettlements.orgId, orgId)),
  ]);

  const out = new Map<string, number | null>();
  for (const t of terminated) out.set(t.userId, null);
  // Newest resignation first, so the first one seen is the one linked.
  for (const r of resigned) if (!out.get(r.userId)) out.set(r.userId, r.id);
  for (const s of settled) out.delete(s.userId);
  return out;
}
