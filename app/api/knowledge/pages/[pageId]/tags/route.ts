import type { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageTags, kbTags } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";

const putSchema = z
  .object({ tagIds: z.array(z.coerce.number().int().positive()).max(50) })
  .strict();

/** KB-0061: the tags on a page. */
export async function GET(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const rows = await db
      .select({ id: kbTags.id, name: kbTags.name, slug: kbTags.slug })
      .from(kbPageTags)
      .innerJoin(
        kbTags,
        and(eq(kbTags.id, kbPageTags.tagId), eq(kbTags.orgId, kbPageTags.orgId)),
      )
      .where(and(eq(kbPageTags.orgId, session.orgId), eq(kbPageTags.pageId, id)));

    return ok({ items: rows });
  }, req);
}

/**
 * Replaces the whole set in one transaction, so a half-applied change cannot
 * leave the page tagged with some of the old and some of the new.
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "edit");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    try {
      const { tagIds } = await parseBody(req, putSchema);
      const unique = [...new Set(tagIds)];

      // A tag from another org would fail the composite foreign key; checking
      // first turns that into a 400 instead of a 500.
      if (unique.length > 0) {
        const known = await db
          .select({ id: kbTags.id })
          .from(kbTags)
          .where(and(eq(kbTags.orgId, session.orgId), inArray(kbTags.id, unique)));
        if (known.length !== unique.length) return err("One of those tags does not exist.", 400);
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(kbPageTags)
          .where(and(eq(kbPageTags.orgId, session.orgId), eq(kbPageTags.pageId, id)));

        if (unique.length > 0) {
          await tx
            .insert(kbPageTags)
            .values(unique.map((tagId) => ({ orgId: session.orgId, pageId: id, tagId })));
        }
      });

      return ok({ pageId: id, tagIds: unique });
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid tags.", 400);
      throw error;
    }
  }, req);
}
