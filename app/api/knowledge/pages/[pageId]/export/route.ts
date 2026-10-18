import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { err, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPages } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import {
  exportContentType,
  exportFileName,
  serializePage,
} from "@/lib/knowledge/export";

const schema = z.object({ format: z.enum(["markdown", "html"]).default("markdown") }).strict();

/**
 * KB-0063: export one page.
 *
 * Streamed straight back rather than stored: a single page is small, and this
 * works with no R2 configured, so an org can always get its content out.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const denied = requireKbPermission(ctx.actor, "kb:pages:export");
    if (denied) return denied;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    try {
      const { format } = await parseBody(req, schema);

      const page = await db.query.kbPages.findFirst({
        where: and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)),
        columns: { title: true, content: true, updatedAt: true },
      });
      if (!page) return kbNotFound();

      const body = serializePage(page, format);

      return new NextResponse(body, {
        headers: {
          "Content-Type": exportContentType(format),
          "Content-Disposition": `attachment; filename="${exportFileName(page.title, format)}"`,
        },
      }) as unknown as NextResponse<never>;
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid format.", 400);
      throw error;
    }
  }, req);
}
