import type { NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbImportJobs } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";

/** KB-0062: the import history. */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:import");
    if (denied) return denied;

    const rows = await db
      .select()
      .from(kbImportJobs)
      .where(eq(kbImportJobs.orgId, session.orgId))
      .orderBy(desc(kbImportJobs.createdAt))
      .limit(50);

    return ok({ items: rows });
  }, req);
}
