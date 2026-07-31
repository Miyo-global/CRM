import { db } from "@/lib/db";
import { assetReturns, assets, users } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

const employeeNameExpr = sql<string | null>`coalesce(
  nullif(trim(${users.name}), ''),
  nullif(trim(concat_ws(' ', ${users.firstName}, ${users.lastName})), ''),
  ${users.email}
)`;

export const hrAssetAdminRoles = new Set(["CEO", "HR", "ADMIN"]);

export function canSeeAllAssetReturns(role: string | undefined | null): boolean {
  return !!role && hrAssetAdminRoles.has(role);
}

const assetReturnRow = {
  id: assetReturns.id,
  orgId: assetReturns.orgId,
  userId: assetReturns.userId,
  assetId: assetReturns.assetId,
  assetName: assetReturns.assetName,
  status: assetReturns.status,
  returnedAt: assetReturns.returnedAt,
  condition: assetReturns.condition,
  notes: assetReturns.notes,
  handoverPhotoUrls: assetReturns.handoverPhotoUrls,
  createdAt: assetReturns.createdAt,
  employeeName: employeeNameExpr,
  assetType: assets.type,
  serialNumber: assets.serialNumber,
};

export async function listAssetReturnsForSession(opts: {
  orgId: string;
  userId: string;
  role: string | undefined | null;
}) {
  const base = db
    .select(assetReturnRow)
    .from(assetReturns)
    .leftJoin(users, eq(assetReturns.userId, users.id))
    .leftJoin(assets, eq(assetReturns.assetId, assets.id));

  if (canSeeAllAssetReturns(opts.role)) {
    return base
      .where(eq(assetReturns.orgId, opts.orgId))
      .orderBy(desc(assetReturns.createdAt));
  }

  return base
    .where(
      and(eq(assetReturns.orgId, opts.orgId), eq(assetReturns.userId, opts.userId)),
    )
    .orderBy(desc(assetReturns.createdAt));
}

export async function getAssetReturnById(opts: {
  orgId: string;
  id: number;
}) {
  const [row] = await db
    .select(assetReturnRow)
    .from(assetReturns)
    .leftJoin(users, eq(assetReturns.userId, users.id))
    .leftJoin(assets, eq(assetReturns.assetId, assets.id))
    .where(and(eq(assetReturns.orgId, opts.orgId), eq(assetReturns.id, opts.id)));

  return row ?? null;
}
