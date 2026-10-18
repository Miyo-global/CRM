import type { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbImportJobs } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";

/**
 * KB-0062: cancel a job that has not finished.
 *
 * Pages already created stay: an import is not a transaction, and pretending it
 * was would mean deleting work somebody may already be editing.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ importJobId: string }> },
) {
  const { importJobId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:import");
    if (denied) return denied;

    const id = Number(importJobId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    const updated = await db
      .update(kbImportJobs)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(kbImportJobs.id, id),
          eq(kbImportJobs.orgId, session.orgId),
          inArray(kbImportJobs.status, ["pending", "processing"]),
        ),
      )
      .returning({ id: kbImportJobs.id });

    if (updated.length === 0) return err("That job has already finished.", 409);

    return ok({ id, status: "cancelled" });
  }, req);
}
