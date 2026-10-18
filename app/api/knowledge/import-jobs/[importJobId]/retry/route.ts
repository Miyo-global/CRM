import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbImportJobs } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotFound } from "@/lib/knowledge/errors";

/**
 * KB-0062: retry a failed import.
 *
 * The retry is a new job row pointing at the old one, and the unique on
 * (org_id, retry_of_job_id) means a double click cannot fan out into two
 * imports of the same file.
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

    const original = await db.query.kbImportJobs.findFirst({
      where: and(eq(kbImportJobs.id, id), eq(kbImportJobs.orgId, session.orgId)),
      columns: { id: true, status: true, sourceType: true, fileKey: true, inputOptions: true, totalItems: true },
    });
    if (!original) return kbNotFound();
    if (original.status !== "failed" && original.status !== "cancelled") {
      return err("Only a failed or cancelled import can be retried.", 409);
    }

    const inserted = await db
      .insert(kbImportJobs)
      .values({
        orgId: session.orgId,
        sourceType: original.sourceType,
        fileKey: original.fileKey,
        status: "pending",
        totalItems: original.totalItems,
        inputOptions: original.inputOptions,
        retryOfJobId: original.id,
        createdById: session.user.id,
      })
      .onConflictDoNothing()
      .returning({ id: kbImportJobs.id });

    const retry = inserted[0];
    if (!retry) return err("That import has already been retried.", 409);

    await createAuditLog({
      action: "kb.import.started",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(retry.id),
      targetType: "kb_import_job",
      metadata: { retryOf: original.id },
    });

    return ok({ jobId: retry.id, retryOf: original.id, status: "pending" }, 202);
  }, req);
}
