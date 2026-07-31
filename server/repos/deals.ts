import "server-only";

import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function findDealById(orgId: string, id: number) {
  return db.query.deals.findFirst({
    where: and(eq(deals.id, id), eq(deals.orgId, orgId)),
    with: {
      assignedTo: { columns: { id: true, name: true, image: true } },
      lead: { columns: { id: true, name: true } },
    },
  });
}

export async function findDealsByOrg(
  orgId: string,
  opts: { stage?: string; assignedToId?: string; limit?: number; offset?: number } = {}
) {
  const filters = [eq(deals.orgId, orgId)];
  if (opts.stage) filters.push(eq(deals.stage, opts.stage as never));
  if (opts.assignedToId) filters.push(eq(deals.assignedToId, opts.assignedToId));

  return db.query.deals.findMany({
    where: and(...filters),
    orderBy: [desc(deals.createdAt)],
    limit: opts.limit ?? 50,
    offset: opts.offset ?? 0,
    with: {
      assignedTo: { columns: { id: true, name: true, image: true } },
    },
  });
}
