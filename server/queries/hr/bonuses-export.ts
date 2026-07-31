import { db } from "@/lib/db";
import { bonuses, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  applyBonusFilters,
  type BonusListFilters,
  type BonusRow,
  DEFAULT_BONUS_FILTERS,
} from "@/lib/hr/bonus-filters";

export async function getBonusExportRows(
  orgId: string,
  filters: Partial<BonusListFilters> = {},
): Promise<BonusRow[]> {
  const merged: BonusListFilters = { ...DEFAULT_BONUS_FILTERS, ...filters };

  const rows = await db
    .select({
      id: bonuses.id,
      userId: bonuses.userId,
      employeeName: users.name,
      amount: bonuses.amount,
      type: bonuses.type,
      reason: bonuses.reason,
      month: bonuses.month,
      status: bonuses.status,
      approvedAt: bonuses.approvedAt,
      createdAt: bonuses.createdAt,
    })
    .from(bonuses)
    .leftJoin(users, eq(bonuses.userId, users.id))
    .where(eq(bonuses.orgId, orgId))
    .orderBy(desc(bonuses.createdAt));

  return applyBonusFilters(
    rows.map((row) => ({
      ...row,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
      approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    })),
    merged,
  );
}
