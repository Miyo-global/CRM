import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { err, ok, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbExportJobs } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { kbNotConfigured, kbNotFound } from "@/lib/knowledge/errors";
import { getFileUrl, isStorageConfigured } from "@/lib/storage";

/** A download link lives five minutes, the file itself 24 hours. */
const DOWNLOAD_URL_TTL_SECONDS = 300;

/** KB-0063: a signed link to a finished export. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ exportJobId: string }> },
) {
  const { exportJobId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:export");
    if (denied) return denied;

    const id = Number(exportJobId);
    if (!Number.isSafeInteger(id) || id <= 0) return kbNotFound();

    const job = await db.query.kbExportJobs.findFirst({
      where: and(eq(kbExportJobs.id, id), eq(kbExportJobs.orgId, session.orgId)),
      columns: { id: true, status: true, fileKey: true, expiresAt: true, format: true },
    });
    if (!job) return kbNotFound();
    if (job.status !== "completed" || !job.fileKey) {
      return err("That export is not ready.", 409);
    }
    if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
      return err("That export has expired. Run a new one.", 410);
    }
    if (!isStorageConfigured()) return kbNotConfigured("storage");

    return ok({
      url: await getFileUrl(job.fileKey, DOWNLOAD_URL_TTL_SECONDS),
      expiresAt: job.expiresAt,
      format: job.format,
    });
  }, req);
}
