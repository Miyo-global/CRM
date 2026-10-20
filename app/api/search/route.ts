import { type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { organizationMembers, projects, tickets, users } from "@/lib/db/schema";
import { eq, and, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { likePattern } from "@/lib/db/escape-like";
import { logger } from "@/lib/logger";
import { mergeSearchResults, type SearchResult } from "@/lib/search/merge-results";

const querySchema = z.object({
  q: z.string().min(3, "Query must be at least 3 characters"),
  limit: z.coerce.number().min(1).max(20).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { q, limit } = parseQuery(req, querySchema);
    // A truncated base64 of the query collided for long queries sharing a
    // prefix; hash the whole query instead.
    const queryHash = createHash("sha256").update(`${q}\0${limit ?? ""}`).digest("base64url").slice(0, 32);
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
  const sources: Record<string, () => Promise<SearchResult[]>> = {
    tickets: async () => {
      const rows = await db
        .select({ id: tickets.id, title: tickets.title, status: tickets.status, projectId: tickets.projectId })
        .from(tickets)
        .where(and(eq(tickets.orgId, orgId), ilike(tickets.title, pattern), isNull(tickets.deletedAt)))
        .limit(maxPer);
      return rows.map(t => ({ id: t.id, type: "ticket" as const, title: t.title, subtitle: `Ticket #${t.id}`, href: `/projects/${t.projectId}?ticket=${t.id}`, status: t.status }));
    },
    projects: async () => {
      const rows = await db
        .select({ id: projects.id, name: projects.name, key: projects.key, status: projects.status })
        .from(projects)
        .where(
          and(
            eq(projects.orgId, orgId),
            isNull(projects.deletedAt),
            or(ilike(projects.name, pattern), ilike(projects.key, pattern)),
          ),
        )
        .limit(maxPer);
      return rows.map(p => ({ id: p.id, type: "project" as const, title: p.name, subtitle: `Project ${p.key}`, href: `/projects/${p.id}`, status: p.status ?? undefined }));
    },
    people: async () => {
      const rows = await db
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
        .limit(maxPer);
      return rows.map(e => ({
        id: e.id,
        type: "employee" as const,
        title: e.name ?? "Employee",
        subtitle: e.designation ?? "Employee",
        href: `/hr/employees/${e.id}`,
        status: e.isActive === false ? "INACTIVE" : undefined,
      }));
    },
  };

  const names = Object.keys(sources);
  const settled = await Promise.allSettled(names.map((name) => sources[name]()));
  settled.forEach((outcome, i) => {
    if (outcome.status === "rejected") {
      logger.error(`Search source "${names[i]}" failed`, outcome.reason);
    }
  });
  return mergeSearchResults(names, settled);
}
