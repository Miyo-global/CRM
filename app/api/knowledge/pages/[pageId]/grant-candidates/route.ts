import type { NextRequest } from "next/server";
import { and, eq, ilike, or } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { escapeLike } from "@/lib/db/escape-like";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { SYSTEM_ROLES } from "@/lib/rbac/permissions";

/** KB-0049: people and roles a grant could name, for the picker. */
export async function GET(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "manage");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
    const pattern = `%${escapeLike(q)}%`;

    const people = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(
        and(
          eq(organizationMembers.orgId, session.orgId),
          ...(q ? [or(ilike(users.name, pattern), ilike(users.email, pattern))] : []),
        ),
      )
      .limit(20);

    const roles = SYSTEM_ROLES.filter((role) =>
      q ? role.toLowerCase().includes(q.toLowerCase()) : true,
    );

    return ok({ people, roles });
  }, req);
}
