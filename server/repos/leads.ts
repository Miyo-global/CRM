import "server-only";

import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export async function findLeadById(orgId: string, id: number) {
  return db.query.leads.findFirst({
    where: and(eq(leads.id, id), eq(leads.orgId, orgId), isNull(leads.deletedAt)),
    with: {
      assignedTo: { columns: { id: true, name: true, image: true } },
    },
  });
}

export async function findLeadsByOrg(
  orgId: string,
  opts: { status?: string; assignedToId?: string; limit?: number; offset?: number } = {}
) {
  const filters = [eq(leads.orgId, orgId), isNull(leads.deletedAt)];
  if (opts.status) filters.push(eq(leads.status, opts.status as never));
  if (opts.assignedToId) filters.push(eq(leads.assignedToId, opts.assignedToId));

  return db.query.leads.findMany({
    where: and(...filters),
    orderBy: [desc(leads.createdAt)],
    limit: opts.limit ?? 50,
    offset: opts.offset ?? 0,
    with: {
      assignedTo: { columns: { id: true, name: true, image: true } },
    },
  });
}
