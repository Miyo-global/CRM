import type { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageTranslations } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { buildExcerpt } from "@/lib/knowledge/content";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { KB_TRANSLATION_STATUSES, normalizeLocale } from "@/lib/knowledge/translations";

const putSchema = z
  .object({
    title: z.string().trim().min(1, "Give the translation a title.").max(300),
    content: z.string().max(400_000).default(""),
    status: z.enum(KB_TRANSLATION_STATUSES).default("translated"),
  })
  .strict();

type Params = { params: Promise<{ pageId: string; locale: string }> };

type Resolved =
  | { ok: false; response: NextResponse }
  | { ok: true; pageId: number; locale: string };

/**
 * Resolve the page and the locale together: a bad locale is a 400 whether or
 * not the page exists, but page access is checked first so an invalid locale
 * cannot be used to probe for pages.
 */
async function resolve(
  session: Parameters<Parameters<typeof withAuth>[0]>[0],
  params: Params["params"],
  action: "view" | "edit",
): Promise<Resolved> {
  const { pageId, locale } = await params;
  const ctx = await kbContext(session);
  if ("response" in ctx) return { ok: false, response: ctx.response };

  const id = Number(pageId);
  const decision = await resolvePageAccess(ctx.actor, id, action);
  if (decision.outcome === "notFound") return { ok: false, response: kbNotFound() };
  if (decision.outcome === "denied") return { ok: false, response: kbDenied() };

  const normalized = normalizeLocale(decodeURIComponent(locale));
  if (!normalized) return { ok: false, response: err("That is not a valid language tag.", 400) };

  return { ok: true, pageId: id, locale: normalized };
}

/** KB-0064: read one translation. */
export async function GET(req: NextRequest, context: Params) {
  return withAuth(async (session) => {
    const resolved = await resolve(session, context.params, "view");
    if (!resolved.ok) return resolved.response;

    const row = await db.query.kbPageTranslations.findFirst({
      where: and(
        eq(kbPageTranslations.orgId, session.orgId),
        eq(kbPageTranslations.pageId, resolved.pageId),
        eq(kbPageTranslations.locale, resolved.locale),
      ),
    });
    if (!row) return kbNotFound();

    return ok(row);
  }, req);
}

/**
 * Write one translation. Creating and updating are the same call because the
 * locale is the identity: a client that has the tag does not need to know
 * whether anyone has translated into it yet.
 */
export async function PUT(req: NextRequest, context: Params) {
  return withAuth(async (session) => {
    const resolved = await resolve(session, context.params, "edit");
    if (!resolved.ok) return resolved.response;

    try {
      const body = await parseBody(req, putSchema);
      const contentText = body.content.trim();

      const [saved] = await db
        .insert(kbPageTranslations)
        .values({
          orgId: session.orgId,
          pageId: resolved.pageId,
          locale: resolved.locale,
          title: body.title,
          content: body.content,
          contentText,
          excerpt: buildExcerpt(contentText),
          status: body.status,
        })
        .onConflictDoUpdate({
          target: [kbPageTranslations.pageId, kbPageTranslations.locale],
          set: {
            title: body.title,
            content: body.content,
            contentText,
            excerpt: buildExcerpt(contentText),
            status: body.status,
            revision: sql`${kbPageTranslations.revision} + 1`,
            updatedAt: new Date(),
          },
        })
        .returning();

      return ok(saved);
    } catch (error) {
      if (error instanceof ZodError) {
        return err(error.issues[0]?.message ?? "Invalid translation.", 400);
      }
      throw error;
    }
  }, req);
}

/** Drop one translation. The source page is untouched. */
export async function DELETE(req: NextRequest, context: Params) {
  return withAuth(async (session) => {
    const resolved = await resolve(session, context.params, "edit");
    if (!resolved.ok) return resolved.response;

    const deleted = await db
      .delete(kbPageTranslations)
      .where(
        and(
          eq(kbPageTranslations.orgId, session.orgId),
          eq(kbPageTranslations.pageId, resolved.pageId),
          eq(kbPageTranslations.locale, resolved.locale),
        ),
      )
      .returning({ id: kbPageTranslations.id });

    if (deleted.length === 0) return kbNotFound();
    return ok({ locale: resolved.locale });
  }, req);
}
