import type { NextRequest } from "next/server";
import { and, asc, eq, lt } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageComments, users } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { deliverMentions } from "@/lib/knowledge/mentions";

export const COMMENT_PAGE_SIZE = 50;

const createSchema = z
  .object({
    content: z.string().trim().min(1, "Write something.").max(10_000),
    parentId: z.coerce.number().int().positive().optional(),
    anchorBlockIndex: z.coerce.number().int().min(0).max(100_000).optional(),
    anchorQuote: z.string().trim().max(500).optional(),
    mentions: z.array(z.string().trim().max(64)).max(20).optional(),
  })
  .strict();

/** KB-0053: the thread on a page. */
export async function GET(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const after = Number(req.nextUrl.searchParams.get("after"));
    const cursor = Number.isSafeInteger(after) && after > 0 ? after : null;

    const rows = await db
      .select({
        id: kbPageComments.id,
        parentId: kbPageComments.parentId,
        content: kbPageComments.content,
        anchorBlockIndex: kbPageComments.anchorBlockIndex,
        anchorQuote: kbPageComments.anchorQuote,
        resolvedAt: kbPageComments.resolvedAt,
        authorId: kbPageComments.authorId,
        authorName: users.name,
        createdAt: kbPageComments.createdAt,
        updatedAt: kbPageComments.updatedAt,
      })
      .from(kbPageComments)
      .leftJoin(users, eq(users.id, kbPageComments.authorId))
      .where(
        and(
          eq(kbPageComments.orgId, session.orgId),
          eq(kbPageComments.pageId, id),
          ...(cursor ? [lt(kbPageComments.id, cursor)] : []),
        ),
      )
      .orderBy(asc(kbPageComments.createdAt))
      .limit(COMMENT_PAGE_SIZE);

    return ok({ items: rows });
  }, req);
}

/** Commenting takes comment access: a viewer may read the thread, not join it. */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "comment");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    try {
      const body = await parseBody(req, createSchema);

      // Threads are one level deep: a reply to a reply hangs off the same root,
      // so a thread cannot become a tree nobody can follow.
      let parentId: number | null = null;
      if (body.parentId) {
        const parent = await db.query.kbPageComments.findFirst({
          where: and(
            eq(kbPageComments.id, body.parentId),
            eq(kbPageComments.orgId, session.orgId),
            eq(kbPageComments.pageId, id),
          ),
          columns: { id: true, parentId: true },
        });
        if (!parent) return kbNotFound();
        parentId = parent.parentId ?? parent.id;
      }

      const [created] = await db
        .insert(kbPageComments)
        .values({
          orgId: session.orgId,
          pageId: id,
          authorId: session.user.id,
          parentId,
          content: body.content,
          anchorBlockIndex: body.anchorBlockIndex ?? null,
          anchorQuote: body.anchorQuote ?? null,
        })
        .returning();

      if (body.mentions?.length) {
        void deliverMentions(session.orgId, id, session.user.id, body.mentions);
      }

      return ok(created, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid comment.", 400);
      throw error;
    }
  }, req);
}
