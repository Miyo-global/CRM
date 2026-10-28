"server-only";

import { db } from "@/lib/db";
import { assets, assetAssignmentHistory, assetReturns } from "@/lib/db/schema";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { Asset } from "@/types/hr";

export async function getAssetAssignmentCounts(
  orgId: string,
  assetIds: number[],
): Promise<Map<number, number>> {
  if (assetIds.length === 0) return new Map();

  const rows = await db
    .select({
      assetId: assetAssignmentHistory.assetId,
      count: sql<number>`count(*)::int`,
    })
    .from(assetAssignmentHistory)
    .where(
      and(
        eq(assetAssignmentHistory.orgId, orgId),
        inArray(assetAssignmentHistory.assetId, assetIds),
        isNotNull(assetAssignmentHistory.toUserId),
      ),
    )
    .groupBy(assetAssignmentHistory.assetId);

  return new Map(rows.map((row) => [row.assetId, row.count]));
}

export async function getAssets(orgId: string): Promise<Asset[]> {
  const rows = await db.query.assets.findMany({
    where: eq(assets.orgId, orgId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    // R3-SA-08: the list shows the assignee's name, also for someone no longer
    // in the active employee list (e.g. a terminated employee returning kit).
    with: { assignedUser: { columns: { id: true, name: true } } },
  });

  const ids = rows.map((row) => row.id);
  const [counts, pendingReturns] = await Promise.all([
    getAssetAssignmentCounts(orgId, ids),
    // Still "Assigned" until HR marks the return Received; surface the
    // outstanding recovery on the list.
    ids.length === 0
      ? []
      : db
          .select({ assetId: assetReturns.assetId })
          .from(assetReturns)
          .where(and(eq(assetReturns.orgId, orgId), eq(assetReturns.status, "PENDING"), inArray(assetReturns.assetId, ids))),
  ]);
  const returnPending = new Set(pendingReturns.map((r) => r.assetId));

  return rows.map((row) => ({
    ...row,
    assignmentCount: counts.get(row.id) ?? 0,
    returnPending: returnPending.has(row.id),
  })) as unknown as Asset[];
}

export async function countAssetAssignments(
  orgId: string,
  assetId: number,
): Promise<number> {
  const counts = await getAssetAssignmentCounts(orgId, [assetId]);
  return counts.get(assetId) ?? 0;
}

export interface MyAssignedAsset {
  id: number;
  name: string;
  type: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  location: string | null;
  status: Asset["status"];
  updatedAt: Date | string | null;
}

export async function getMyAssignedAssets(
  orgId: string,
  userId: string,
): Promise<MyAssignedAsset[]> {
  const rows = await db.query.assets.findMany({
    where: and(
      eq(assets.orgId, orgId),
      eq(assets.assignedTo, userId),
      eq(assets.status, "ASSIGNED"),
    ),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
    columns: {
      id: true,
      name: true,
      type: true,
      serialNumber: true,
      brand: true,
      model: true,
      location: true,
      status: true,
      updatedAt: true,
    },
  });

  return rows as MyAssignedAsset[];
}
