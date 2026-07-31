import "server-only";

import { db } from "@/lib/db";
import { clientAccounts } from "@/lib/db/schema";
import { eq, and, desc, lt, or } from "drizzle-orm";
import { decodeCursor, buildCursorPage, type CursorPaginatedResponse } from "@/lib/cursor-pagination";

const userColumns = { id: true, name: true, image: true, email: true } as const;

export async function findClientAccountById(orgId: string, id: number) {
  return db.query.clientAccounts.findFirst({
    where: and(eq(clientAccounts.id, id), eq(clientAccounts.orgId, orgId)),
    with: {
      salesRep: { columns: userColumns },
      assignedCrm: { columns: userColumns },
      lead: { columns: { id: true, name: true, source: true, priority: true } },
    },
  });
}

export async function findClientAccountsByOrg(
  orgId: string,
  opts: { limit?: number; offset?: number; status?: string } = {}
) {
  const filters = [eq(clientAccounts.orgId, orgId)];
  if (opts.status) filters.push(eq(clientAccounts.status, opts.status as never));

  return db.query.clientAccounts.findMany({
    where: and(...filters),
    orderBy: [desc(clientAccounts.createdAt)],
    limit: opts.limit ?? 25,
    offset: opts.offset ?? 0,
    with: {
      salesRep: { columns: { id: true, name: true, image: true } },
      assignedCrm: { columns: { id: true, name: true, image: true } },
    },
  });
}

export async function findClientAccountsByOrgCursor(
  orgId: string,
  opts: { cursor?: string; limit?: number; status?: string } = {}
): Promise<CursorPaginatedResponse<Awaited<ReturnType<typeof findClientAccountsByOrg>>[number]>> {
  const limit = opts.limit ?? 25;
  const filters = [eq(clientAccounts.orgId, orgId)];
  if (opts.status) filters.push(eq(clientAccounts.status, opts.status as never));

  if (opts.cursor) {
    const decoded = decodeCursor(opts.cursor);
    if (decoded) {
      filters.push(
        or(
          lt(clientAccounts.createdAt, decoded.createdAt),
          and(eq(clientAccounts.createdAt, decoded.createdAt), lt(clientAccounts.id, decoded.id))
        )!
      );
    }
  }

  const rows = await db.query.clientAccounts.findMany({
    where: and(...filters),
    orderBy: [desc(clientAccounts.createdAt), desc(clientAccounts.id)],
    limit: limit + 1,
    with: {
      salesRep: { columns: { id: true, name: true, image: true } },
      assignedCrm: { columns: { id: true, name: true, image: true } },
    },
  });

  return buildCursorPage(rows, limit, (r) => ({
    id: r.id,
    createdAt: r.createdAt!,
  }));
}
