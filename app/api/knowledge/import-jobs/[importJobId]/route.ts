import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbImportJobs } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";

/** KB-0062: one import job, with its error report. */
export async function GET(
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

    const job = await db.query.kbImportJobs.findFirst({
      where: and(eq(kbImportJobs.id, id), eq(kbImportJobs.orgId, session.orgId)),
    });
    if (!job) return kbNotFound();

    return ok(job);
  }, req);
}
