import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { organizationMembers, projects, tickets, users } from "@/lib/db/schema";
import { eq, and, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().min(3, "Query must be at least 3 characters"),
  limit: z.coerce.number().min(1).max(20).optional(),
});

interface SearchResult {
  id: number | string;
  type: "ticket" | "project" | "employee";
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

/** % and _ are wildcards in LIKE: a search for "50%" must match literally. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
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
    const pattern = likePattern(q);

    // Tickets, projects and people — the palette used to find nothing but
    // tickets, so searching a colleague's name came back empty (QA-0039).
    const [ticketResults, projectResults, employeeResults] = await Promise.all([
      db
        .select({ id: tickets.id, title: tickets.title, status: tickets.status, projectId: tickets.projectId })
        .from(tickets)
        .where(and(eq(tickets.orgId, orgId), ilike(tickets.title, pattern), isNull(tickets.deletedAt)))
        .limit(maxPer),
      db
        .select({ id: projects.id, name: projects.name, key: projects.key, status: projects.status })
        .from(projects)
        .where(
          and(
            eq(projects.orgId, orgId),
            isNull(projects.deletedAt),
            or(ilike(projects.name, pattern), ilike(projects.key, pattern)),
          ),
        )
        .limit(maxPer),
      db
        .select({
          id: users.id,
          name: users.name,
          designation: users.designation,
          isActive: users.isActive,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            or(ilike(users.name, pattern), ilike(users.employeeId, pattern)),
          ),
        )
        .limit(maxPer),
    ]);

    const results: SearchResult[] = [
      ...ticketResults.map(t => ({ id: t.id, type: "ticket" as const, title: t.title, subtitle: `Ticket #${t.id}`, href: `/projects/${t.projectId}?ticket=${t.id}`, status: t.status })),
      ...projectResults.map(p => ({ id: p.id, type: "project" as const, title: p.name, subtitle: `Project ${p.key}`, href: `/projects/${p.id}`, status: p.status ?? undefined })),
      ...employeeResults.map(e => ({
        id: e.id,
        type: "employee" as const,
        title: e.name ?? "Employee",
        subtitle: e.designation ?? "Employee",
        href: `/hr/employees/${e.id}`,
        status: e.isActive === false ? "INACTIVE" : undefined,
      })),
    ];

    return { results, total: results.length };
}
