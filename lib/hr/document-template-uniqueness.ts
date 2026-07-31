import { db } from "@/lib/db";
import { documentTemplates } from "@/lib/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";

export async function findActiveTemplateDuplicate(
  orgId: string,
  title: string,
  type: string,
  excludeId?: number,
) {
  const conditions = [
    eq(documentTemplates.orgId, orgId),
    eq(documentTemplates.isActive, true),
    eq(documentTemplates.type, type),
    sql`lower(${documentTemplates.title}) = lower(${title.trim()})`,
  ];
  if (excludeId != null) {
    conditions.push(ne(documentTemplates.id, excludeId));
  }

  const [row] = await db
    .select({ id: documentTemplates.id })
    .from(documentTemplates)
    .where(and(...conditions))
    .limit(1);

  return row ?? null;
}
