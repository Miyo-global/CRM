import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().min(3, "Query must be at least 3 characters"),
  limit: z.coerce.number().min(1).max(20).optional(),
});

interface SearchResult {
  id: number;
  type: "ticket";
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

    const ticketResults = await db.select({ id: tickets.id, title: tickets.title, status: tickets.status, projectId: tickets.projectId })
      .from(tickets)
      .where(and(eq(tickets.orgId, orgId), ilike(tickets.title, pattern)))
      .limit(maxPer);

    const results: SearchResult[] = [
      ...ticketResults.map(t => ({ id: t.id, type: "ticket" as const, title: t.title, subtitle: `Ticket #${t.id}`, href: `/projects/${t.projectId}?ticket=${t.id}`, status: t.status })),
    ];

    return { results, total: results.length };
}
