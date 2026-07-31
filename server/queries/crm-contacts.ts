"server-only";

import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq, and, sql, count, or } from "drizzle-orm";
import type { ContactFilters } from "@/types/crm";

export async function getContacts(orgId: string, filters?: ContactFilters) {
  const conditions = [eq(contacts.orgId, orgId)];
  if (filters?.organizationId)
    conditions.push(eq(contacts.organizationId, filters.organizationId));
  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(
      or(
        sql`${contacts.name} ILIKE ${s}`,
        sql`${contacts.email} ILIKE ${s}`,
        sql`${contacts.company} ILIKE ${s}`
      )!
    );
  }

  const [totalResult] = await db
    .select({ count: count() })
    .from(contacts)
    .where(and(...conditions));

  const items = await db.query.contacts.findMany({
    where: and(...conditions),
    with: {
      lead: { columns: { id: true, name: true } },
      deal: { columns: { id: true, name: true } },
    },
    orderBy: [contacts.name, contacts.id],
    limit: filters?.limit ?? 50,
    offset: filters?.offset ?? 0,
  });

  return { items, total: totalResult?.count ?? 0 };
}

export async function getContact(orgId: string, id: number) {
  return db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.orgId, orgId)),
    with: { crmOrganization: true, lead: true, deal: true },
  });
}
