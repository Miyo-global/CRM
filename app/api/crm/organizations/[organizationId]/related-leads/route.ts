import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmOrganizations, leads, contacts } from "@/lib/db/schema";
import { eq, and, ilike, or, inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

type Params = { params: Promise<{ organizationId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { organizationId } = await params;
  const id = Number(organizationId);
  if (!Number.isFinite(id)) return err("Invalid organizationId", 400);

  return withAuth(async (session) => {
    const [org] = await db
      .select({ name: crmOrganizations.name })
      .from(crmOrganizations)
      .where(and(eq(crmOrganizations.id, id), eq(crmOrganizations.orgId, session.orgId)));

    if (!org) return err("Organization not found", 404);

    const linkedContactLeadIds = await db
      .select({ leadId: contacts.leadId })
      .from(contacts)
      .where(
        and(
          eq(contacts.orgId, session.orgId),
          eq(contacts.organizationId, id),
        ),
      )
      .then((rows) => rows.map((r) => r.leadId).filter((lid): lid is number => lid !== null));

    const safeName = org.name.replaceAll("%", "\\%").replaceAll("_", "\\_");

    const conditions = [ilike(leads.company, `%${safeName}%`)];
    if (linkedContactLeadIds.length > 0) {
      conditions.push(inArray(leads.id, linkedContactLeadIds));
    }

    const relatedLeads = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        phone: leads.phone,
        status: leads.status,
        priority: leads.priority,
        company: leads.company,
        source: leads.source,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(and(eq(leads.orgId, session.orgId), or(...conditions)))
      .orderBy(leads.createdAt)
      .limit(50);

    return ok(relatedLeads);
  });
}
