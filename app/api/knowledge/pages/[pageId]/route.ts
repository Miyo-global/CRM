import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPageFavorites, kbPages } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { accessSatisfies, type KbPageAction } from "@/lib/knowledge/access-levels";
import { kbConflict, kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { trashSubtree } from "@/lib/knowledge/page-lifecycle";
import { commitPageChange, KbPageConflictError } from "@/lib/knowledge/page-writer";
import { isPageSpaceArchived } from "@/lib/knowledge/space-lifecycle";
import { getAncestors } from "@/lib/knowledge/tree";
import { logKbEvent } from "@/lib/knowledge/events";

const CONTENT_TYPES = [
  "note",
  "sop",
  "policy",
  "support_article",
  "troubleshooting",
  "decision_record",
  "meeting_notes",
  "runbook",
  "project_brief",
  "playbook",
] as const;

const patchSchema = z
  .object({
    title: z.string().trim().max(500).optional(),
    icon: z.string().trim().max(60).nullable().optional(),
    coverImage: z.string().trim().max(1000).nullable().optional(),
    content: z.unknown().optional(),
    contentType: z.enum(CONTENT_TYPES).optional(),
    ownerUserId: z.string().trim().max(64).nullable().optional(),
    reviewIntervalDays: z.coerce.number().int().min(1).max(3650).nullable().optional(),
    expectedRevision: z.coerce.number().int().min(1).optional(),
  })
  .strict();

/** KB-0039: the page, its breadcrumbs and what this caller may do with it. */
export async function GET(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "view");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const page = await db.query.kbPages.findFirst({
      where: and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)),
    });
    if (!page) return kbNotFound();

    const [breadcrumbs, favorite, spaceArchived] = await Promise.all([
      getAncestors(session.orgId, id),
      db.query.kbPageFavorites.findFirst({
        where: and(
          eq(kbPageFavorites.orgId, session.orgId),
          eq(kbPageFavorites.pageId, id),
          eq(kbPageFavorites.userId, session.user.id),
        ),
        columns: { id: true },
      }),
      isPageSpaceArchived(session.orgId, page.spaceId),
    ]);

    const held = decision.scope.action;
    const may = (action: KbPageAction) =>
      accessSatisfies(held, action) && !(spaceArchived && action !== "view") && !(page.isLocked && action !== "view" && !accessSatisfies(held, "manage"));

    // Reading is what analytics counts; the write is fire and forget.
    void logKbEvent(session.orgId, "view", { actorId: session.user.id, pageId: id });

    return ok({
      page,
      breadcrumbs: breadcrumbs.reverse(),
      myAccess: held,
      via: decision.scope.via,
      isFavorite: !!favorite,
      spaceArchived,
      capabilities: {
        comment: may("comment"),
        edit: may("edit"),
        manage: may("manage"),
      },
    });
  }, req);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "edit");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const page = await db.query.kbPages.findFirst({
      where: and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)),
      columns: { id: true, isLocked: true, spaceId: true, contentRevision: true },
    });
    if (!page) return kbNotFound();

    // A locked page is still editable by someone who can manage it; that is
    // what unlocking is for.
    if (page.isLocked && !accessSatisfies(decision.scope.action, "manage")) {
      return err("This page is locked.", 403);
    }
    if (await isPageSpaceArchived(session.orgId, page.spaceId)) {
      return err("This page's space is archived and is read-only.", 403);
    }

    try {
      const body = await parseBody(req, patchSchema);
      const { expectedRevision, ownerUserId, reviewIntervalDays, icon, coverImage, contentType, ...rest } =
        body;

      if (Object.keys(body).length === 0) return err("Nothing to change.", 400);

      // Columns that do not go through the writer's derived-content path.
      const metadata: Record<string, unknown> = {};
      if (icon !== undefined) metadata.icon = icon;
      if (coverImage !== undefined) metadata.coverImage = coverImage;
      if (contentType !== undefined) metadata.contentType = contentType;
      if (ownerUserId !== undefined) metadata.ownerUserId = ownerUserId;
      if (reviewIntervalDays !== undefined) metadata.reviewIntervalDays = reviewIntervalDays;
      if (Object.keys(metadata).length > 0) {
        await db
          .update(kbPages)
          .set({ ...metadata, updatedAt: new Date() })
          .where(and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)));
      }

      const result = await commitPageChange({
        orgId: session.orgId,
        pageId: id,
        actorId: session.user.id,
        action: "kb.page.updated",
        ...(rest.content !== undefined ? { content: rest.content } : {}),
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(expectedRevision !== undefined ? { expectedRevision } : {}),
        metadata,
      });

      return ok({ id, ...result });
    } catch (error) {
      if (error instanceof KbPageConflictError) return kbConflict(error.currentRevision);
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid page.", 400);
      throw error;
    }
  }, req);
}

/**
 * KB-0043: delete to the trash, with the subtree, and revoke the share links.
 * Nothing is removed for good here; that is the purge in KB-0044.
 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "manage");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    const page = await db.query.kbPages.findFirst({
      where: and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)),
      columns: { id: true, legalHold: true, deletedAt: true },
    });
    if (!page) return kbNotFound();
    if (page.deletedAt) return err("That page is already in the trash.", 409);
    if (page.legalHold) {
      return err("This page is under legal hold and cannot be deleted.", 409);
    }

    const ids = await trashSubtree(session.orgId, id, session.user.id);

    await createAuditLog({
      action: "kb.page.deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(id),
      targetType: "kb_page",
      metadata: { pages: ids.length },
    });

    return ok({ id, deleted: ids.length });
  }, req);
}
