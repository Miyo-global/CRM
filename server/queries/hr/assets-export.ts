import "server-only";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { getAssets } from "@/server/queries/hr/assets";
import type { AssetExportRow } from "@/lib/hr/assets-export-format";
import type { Asset } from "@/types/hr";

export type { AssetExportRow } from "@/lib/hr/assets-export-format";
export { buildAssetsCsvString, assetRowsToXlsxSheets } from "@/lib/hr/assets-export-format";

export async function getAssetExportRows(
  orgId: string,
  statusFilter?: string
): Promise<AssetExportRow[]> {
  let rows = await getAssets(orgId);
  if (statusFilter) {
    rows = rows.filter((a: Asset) => a.status === statusFilter);
  }

  const assigneeIds = [
    ...new Set(rows.map((a) => a.assignedTo).filter((id): id is string => Boolean(id))),
  ];
  const nameById = new Map<string, string>();
  if (assigneeIds.length > 0) {
    const people = await db.query.users.findMany({
      where: inArray(users.id, assigneeIds),
      columns: { id: true, name: true },
    });
    for (const p of people) {
      nameById.set(p.id, p.name?.trim() || p.id);
    }
  }

  return rows.map((a) => ({
    name: a.name ?? "",
    type: a.type ?? "",
    serialNumber: a.serialNumber ?? "",
    status: a.status ?? "",
    assignedToName: a.assignedTo ? nameById.get(a.assignedTo) ?? a.assignedTo : "",
    purchaseCost: a.purchaseCost != null ? String(a.purchaseCost) : "",
    purchaseDate: a.purchaseDate ?? "",
    notes: a.notes ?? "",
  }));
}
