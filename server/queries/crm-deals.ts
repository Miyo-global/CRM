"server-only";

import { db } from "@/lib/db";
import { deals, dealActivities } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import type { DealFilters } from "@/types/crm";

export interface DealsListResult {
  data: Awaited<ReturnType<typeof db.query.deals.findMany>>;
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
}

export async function getDeals(
  orgId: string,
  filters?: DealFilters & { role?: string; userId?: string }
) {
  const f = [eq(deals.orgId, orgId)];
  if (filters?.role === "SALES" && filters.userId) {
    f.push(eq(deals.assignedToId, filters.userId));
  }
  if (filters?.stage) f.push(eq(deals.stage, filters.stage));
  if (filters?.assignedToId) f.push(eq(deals.assignedToId, filters.assignedToId));

  const where = and(...f);
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const [data, countRow] = await Promise.all([
    db.query.deals.findMany({
      where,
      with: {
        assignedTo: { columns: { id: true, name: true, image: true } },
        lead: { columns: { id: true, name: true } },
        client: { columns: { id: true, name: true } },
      },
      orderBy: [desc(deals.updatedAt)],
      limit,
      offset,
    }),
    db.select({ total: count() }).from(deals).where(where),
  ]);

  const total = countRow[0]?.total ?? 0;

  return {
    data,
    total,
    limit,
    offset,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}

export async function getDeal(orgId: string, id: number) {
  return db.query.deals.findFirst({
    where: and(eq(deals.id, id), eq(deals.orgId, orgId)),
    with: {
      assignedTo: { columns: { id: true, name: true, image: true } },
      lead: { columns: { id: true, name: true, email: true, phone: true } },
      client: { columns: { id: true, name: true } },
    },
  });
}

export async function getDealActivities(orgId: string, dealId: number, limit = 50) {
  return db.query.dealActivities.findMany({
    where: and(eq(dealActivities.dealId, dealId), eq(dealActivities.orgId, orgId)),
    with: { user: { columns: { id: true, name: true, image: true } } },
    orderBy: [desc(dealActivities.createdAt)],
    limit,
  });
}
