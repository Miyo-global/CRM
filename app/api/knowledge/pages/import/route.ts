import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbImportJobs } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { IMPORT_INLINE_LIMIT, importRequestSchema, runImport } from "@/lib/knowledge/import";
import { isKbJobsConfigured } from "@/lib/knowledge/config";
import { logger } from "@/lib/logger";

/**
 * KB-0062: run an import.
 *
 * A small import runs in the request, because waiting for a queue to come back
 * for eight pages is worse than the second it takes. A larger one is queued,
 * and if Inngest is not configured the job row is left pending for the cron
 * sweeper — which is why the row is written before any work happens.
 */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:import");
    if (denied) return denied;

    try {
      const request = await parseBody(req, importRequestSchema);

      const [job] = await db
        .insert(kbImportJobs)
        .values({
          orgId: session.orgId,
          sourceType: request.sourceType,
          status: "pending",
          totalItems: request.items.length,
          inputOptions: {
            spaceId: request.spaceId ?? null,
            visibility: request.visibility,
            duplicatePolicy: request.duplicatePolicy,
          },
          createdById: session.user.id,
        })
        .returning();

      await createAuditLog({
        action: "kb.import.started",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(job.id),
        targetType: "kb_import_job",
        metadata: { items: request.items.length, sourceType: request.sourceType },
      });

      const runNow = request.items.length <= IMPORT_INLINE_LIMIT || !isKbJobsConfigured();

      if (!runNow) {
        try {
          await inngest.send({
            name: "kb/import.requested" as never,
            data: { orgId: session.orgId, jobId: job.id, actorId: session.user.id, request },
          });
          return ok({ jobId: job.id, status: "queued" }, 202);
        } catch (error) {
          // Queueing failed: leave it pending for the sweeper rather than
          // losing the request.
          logger.error("kb.import.enqueue_failed", { jobId: job.id, error: String(error) });
          return ok({ jobId: job.id, status: "pending" }, 202);
        }
      }

      await db
        .update(kbImportJobs)
        .set({ status: "processing", updatedAt: new Date() })
        .where(and(eq(kbImportJobs.id, job.id), eq(kbImportJobs.orgId, session.orgId)));

      const outcome = await runImport(session.orgId, session.user.id, request);

      await db
        .update(kbImportJobs)
        .set({
          status: outcome.failed > 0 && outcome.created + outcome.updated === 0 ? "failed" : "completed",
          processedItems: request.items.length,
          succeededItems: outcome.created + outcome.updated,
          failedItems: outcome.failed,
          duplicateItems: outcome.skipped,
          errorReport: outcome.errors.length ? { errors: outcome.errors } : null,
          updatedAt: new Date(),
        })
        .where(and(eq(kbImportJobs.id, job.id), eq(kbImportJobs.orgId, session.orgId)));

      return ok({ jobId: job.id, status: "completed", ...outcome });
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid import.", 400);
      throw error;
    }
  }, req);
}
