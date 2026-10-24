import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leaveBalances } from "@/lib/db/schema";

/** db or an open transaction. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

/**
 * Adds `days` to the user's balance for that leave type and year, creating the
 * row when there is none. One upsert on the unique (org, user, type, year)
 * index (drizzle/0193), so two concurrent credits can neither race into a
 * duplicate row nor lose one of the additions.
 */
export async function creditLeaveBalance(
  tx: Tx,
  row: { orgId: string; userId: string; leaveTypeId: number; year: number; days: number },
): Promise<void> {
  await tx
    .insert(leaveBalances)
    .values({
      orgId: row.orgId,
      userId: row.userId,
      leaveTypeId: row.leaveTypeId,
      year: row.year,
      balance: String(row.days),
    })
    .onConflictDoUpdate({
      target: [leaveBalances.orgId, leaveBalances.userId, leaveBalances.leaveTypeId, leaveBalances.year],
      set: { balance: sql`${leaveBalances.balance} + ${String(row.days)}::numeric` },
    });
}
