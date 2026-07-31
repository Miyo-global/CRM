"server-only";

import { db } from "@/lib/db";
import { recognitions, departmentMembers, departments } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import {
  filterRecognitionRows,
  type RecognitionExportRow,
} from "@/lib/hr/recognition-export-rows";
import type { RecognitionExportFilters } from "@/lib/hr/recognition-export-filters";

export async function getRecognitionExportRows(
  orgId: string,
  filters: RecognitionExportFilters,
  options: { isAdmin: boolean; currentUserId: string },
): Promise<RecognitionExportRow[]> {
  const rows = await db.query.recognitions.findMany({
    where: eq(recognitions.orgId, orgId),
    with: { fromUser: true, toUser: true },
    orderBy: [desc(recognitions.createdAt)],
    limit: 500,
  });

  const userIds = [...new Set(rows.flatMap((r) => [r.fromUserId, r.toUserId]))];
  const deptRows = userIds.length
    ? await db
        .select({ userId: departmentMembers.userId, deptName: departments.name })
        .from(departmentMembers)
        .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
        .where(inArray(departmentMembers.userId, userIds))
    : [];

  const userDept = new Map<string, string>();
  for (const d of deptRows) {
    if (!userDept.has(d.userId)) userDept.set(d.userId, d.deptName);
  }

  const mapped: RecognitionExportRow[] = rows.map((r) => ({
    id: r.id,
    fromUserId: r.fromUserId,
    toUserId: r.toUserId,
    message: r.message,
    category: r.category,
    createdAt: r.createdAt,
    fromUser: r.fromUser
      ? {
          name: (r.fromUser as { name?: string | null }).name ?? null,
          email: (r.fromUser as { email?: string | null }).email ?? null,
        }
      : null,
    toUser: r.toUser
      ? {
          name: (r.toUser as { name?: string | null }).name ?? null,
          email: (r.toUser as { email?: string | null }).email ?? null,
        }
      : null,
    fromUserDept: userDept.get(r.fromUserId) ?? null,
    toUserDept: userDept.get(r.toUserId) ?? null,
  }));

  return filterRecognitionRows(mapped, filters, options);
}
