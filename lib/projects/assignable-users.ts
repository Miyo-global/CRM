import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";

export async function allOrgMembers(orgId: string, userIds: Iterable<string>): Promise<boolean> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return true;
  const rows = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), inArray(organizationMembers.userId, ids)));
  return rows.length === ids.length;
}
