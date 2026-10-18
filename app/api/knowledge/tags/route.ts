import type { NextRequest } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageTags, kbTags } from "@/lib/db/schema";
import { kbContext, requireKbPermission } from "@/lib/knowledge/actor";
import { slugify } from "@/lib/ats/slug";

const createSchema = z
  .object({ name: z.string().trim().min(1, "Name the tag.").max(60) })
  .strict();

/** KB-0061: the org's tags, with how many pages carry each. */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const pageCount = sql<number>`(
      SELECT count(*)::int FROM ${kbPageTags}
      WHERE ${kbPageTags.tagId} = ${kbTags.id} AND ${kbPageTags.orgId} = ${kbTags.orgId}
    )`;

    const rows = await db
      .select({
        id: kbTags.id,
        name: kbTags.name,
        slug: kbTags.slug,
        pageCount,
      })
      .from(kbTags)
      .where(eq(kbTags.orgId, session.orgId))
      .orderBy(asc(kbTags.name))
      .limit(200);

    return ok({ items: rows });
  }, req);
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    // Tagging is page curation, so it rides on the page permissions rather
    // than inventing a kb:tags:* permission the catalog does not have.
    const denied = requireKbPermission(ctx.actor, "kb:pages:update", "kb:pages:manage");
    if (denied) return denied;

    try {
      const { name } = await parseBody(req, createSchema);
      const slug = slugify(name);
      if (!slug) return err("That name has no letters or numbers in it.", 400);

      const inserted = await db
        .insert(kbTags)
        .values({ orgId: session.orgId, name, slug })
        .onConflictDoNothing()
        .returning();

      const created = inserted[0];
      if (!created) return err("That tag already exists.", 409);

      return ok(created, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid tag.", 400);
      throw error;
    }
  }, req);
}
