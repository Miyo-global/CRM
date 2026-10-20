import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { offerLetterTemplates } from "@/lib/db/schema";

/** Template names are unique per org, ignoring case (BUG-23). */
export async function isOfferTemplateNameTaken(orgId: string, name: string, exceptId?: number): Promise<boolean> {
  const [row] = await db
    .select({ id: offerLetterTemplates.id })
    .from(offerLetterTemplates)
    .where(
      and(
        eq(offerLetterTemplates.orgId, orgId),
        sql`lower(trim(${offerLetterTemplates.name})) = ${name.trim().toLowerCase()}`,
        exceptId !== undefined ? ne(offerLetterTemplates.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  return !!row;
}

export const DUPLICATE_TEMPLATE_NAME = "A template with this name already exists.";
