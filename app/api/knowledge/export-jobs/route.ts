import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbExportJobs, kbPages } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { visiblePagesPredicate } from "@/lib/knowledge/authorization";
import { kbNotConfigured } from "@/lib/knowledge/errors";
import { exportExpiry, exportFileName, serializePage } from "@/lib/knowledge/export";
import { isStorageConfigured, uploadFile } from "@/lib/storage";

const schema = z
  .object({
    scope: z.enum(["all"]).default("all"),
    format: z.enum(["markdown", "html"]).default("markdown"),
  })
  .strict();

/** KB-0063: the export history. */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:export");
    if (denied) return denied;

    const rows = await db
      .select()
      .from(kbExportJobs)
      .where(eq(kbExportJobs.orgId, session.orgId))
      .orderBy(desc(kbExportJobs.createdAt))
      .limit(50);

    return ok({ items: rows });
  }, req);
}

/**
 * Export everything the caller can see, as a zip in R2.
 *
 * A whole-wiki export needs somewhere to put the file, so this one does require
 * storage; the single-page export is the escape hatch when there is none. Only
 * pages the caller can already read are included — an export must not be a way
 * around page access.
 */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:export");
    if (denied) return denied;

    if (!isStorageConfigured()) return kbNotConfigured("storage");

    try {
      const { format } = await parseBody(req, schema);

      const [job] = await db
        .insert(kbExportJobs)
        .values({
          orgId: session.orgId,
          scopeType: "all",
          format,
          status: "processing",
          createdById: session.user.id,
        })
        .returning();

      await createAuditLog({
        action: "kb.export.started",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(job.id),
        targetType: "kb_export_job",
        metadata: { scope: "all", format },
      });

      const pages = await db
        .select({ id: kbPages.id, title: kbPages.title, content: kbPages.content })
        .from(kbPages)
        .where(visiblePagesPredicate(ctx.actor))
        .limit(2000);

      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const used = new Set<string>();
      for (const page of pages) {
        let name = exportFileName(page.title, format);
        // Two pages may share a title; the id keeps the entries apart.
        if (used.has(name)) name = `${page.id}-${name}`;
        used.add(name);
        zip.file(name, serializePage(page, format));
      }

      const buffer = await zip.generateAsync({ type: "nodebuffer" });
      const uploaded = await uploadFile(
        buffer,
        `kb-exports/${session.orgId}`,
        `knowledge-${format}-${job.id}.zip`,
        "application/zip",
        session.orgId,
      );

      const [finished] = await db
        .update(kbExportJobs)
        .set({
          status: "completed",
          fileKey: uploaded.key,
          expiresAt: exportExpiry(),
          updatedAt: new Date(),
        })
        .where(and(eq(kbExportJobs.id, job.id), eq(kbExportJobs.orgId, session.orgId)))
        .returning();

      return ok({ jobId: job.id, pages: pages.length, status: finished.status });
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid export.", 400);
      throw error;
    }
  }, req);
}
