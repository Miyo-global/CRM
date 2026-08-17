import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { leads, deals, contacts, clients, tickets } from "@/lib/db/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";

const querySchema = z.object({
  q: z.string().min(3, "Query must be at least 3 characters"),
  limit: z.coerce.number().min(1).max(20).optional(),
});

interface SearchResult {
  id: number;
  type: "lead" | "deal" | "contact" | "client" | "ticket";
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { q, limit } = parseQuery(req, querySchema);
    const queryHash = Buffer.from(q + (limit ?? "")).toString("base64url").slice(0, 32);
    const data = await cached(
      CACHE_KEYS.searchResults(session.orgId, queryHash),
      () => executeSearch(session.orgId, q, limit),
      { ttlSeconds: CACHE_TTL.SHORT },
    );
    return ok(data);
  });
}

async function executeSearch(orgId: string, q: string, limit?: number) {
    const maxPer = Math.min(limit ?? 5, 20);
    const pattern = `%${q}%`;

    const [leadResults, dealResults, contactResults, clientResults, ticketResults] = await Promise.all([

      db.select({ id: leads.id, name: leads.name, email: leads.email, company: leads.company, status: leads.status })
        .from(leads)
        .where(and(eq(leads.orgId, orgId), or(ilike(leads.name, pattern), ilike(leads.email, pattern), ilike(leads.company, pattern), ilike(leads.phone, pattern))))
        .limit(maxPer),

      db.select({ id: deals.id, name: deals.name, value: deals.value, stage: deals.stage, contactPerson: deals.contactPerson })
        .from(deals)
        .where(and(eq(deals.orgId, orgId), or(ilike(deals.name, pattern), ilike(deals.contactPerson, pattern))))
        .limit(maxPer),

      db.select({ id: contacts.id, name: contacts.name, email: contacts.email, company: contacts.company })
        .from(contacts)
        .where(and(eq(contacts.orgId, orgId), or(ilike(contacts.name, pattern), ilike(contacts.email, pattern), ilike(contacts.company, pattern))))
        .limit(maxPer),

      db.select({ id: clients.id, name: clients.name, company: clients.company, status: clients.status })
        .from(clients)
        .where(and(eq(clients.orgId, orgId), or(ilike(clients.name, pattern), ilike(clients.company, pattern))))
        .limit(maxPer),

      db.select({ id: tickets.id, title: tickets.title, status: tickets.status, projectId: tickets.projectId })
        .from(tickets)
        .where(and(eq(tickets.orgId, orgId), ilike(tickets.title, pattern)))
        .limit(maxPer),
    ]);

    const results: SearchResult[] = [
      ...leadResults.map(l => ({ id: l.id, type: "lead" as const, title: l.name, subtitle: [l.email, l.company].filter(Boolean).join(" · ") || "Lead", href: `/crm/leads/${l.id}`, status: l.status })),
      ...dealResults.map(d => ({ id: d.id, type: "deal" as const, title: d.name, subtitle: d.contactPerson || `${CURRENCY_SYMBOL}${d.value || 0}`, href: `/crm/deals/${d.id}`, status: d.stage })),
      ...contactResults.map(c => ({ id: c.id, type: "contact" as const, title: c.name, subtitle: [c.email, c.company].filter(Boolean).join(" · ") || "Contact", href: `/crm/contacts` })),
      ...clientResults.map(c => ({ id: c.id, type: "client" as const, title: c.name, subtitle: c.company || "Client", href: `/crm/clients/${c.id}`, status: c.status })),
      ...ticketResults.map(t => ({ id: t.id, type: "ticket" as const, title: t.title, subtitle: `Ticket #${t.id}`, href: `/projects/${t.projectId}?ticket=${t.id}`, status: t.status })),
    ];

    return { results, total: results.length };
}
