import type { NextRequest } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPages, kbPageTemplates, kbSpaces } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import {
  isKbAdmin,
  resolvePageAccess,
  visiblePagesPredicate,
} from "@/lib/knowledge/authorization";
import { buildExcerpt, extractContentText } from "@/lib/knowledge/content";
import { kbNotFound } from "@/lib/knowledge/errors";
import { resolveSpaceRole, spaceRoleSatisfies } from "@/lib/knowledge/space-access";
import { nextSortOrder } from "@/lib/knowledge/tree";

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

const createSchema = z
  .object({
    title: z.string().trim().max(500).default(""),
    spaceId: z.coerce.number().int().positive().optional(),
    parentPageId: z.coerce.number().int().positive().optional(),
    projectId: z.coerce.number().int().positive().optional(),
    templateId: z.coerce.number().int().positive().optional(),
    contentType: z.enum(CONTENT_TYPES).default("note"),
    visibility: z.enum(["private", "org", "public"]).optional(),
    content: z.unknown().optional(),
  })
  .strict();

/** KB-0038: a new page, optionally from a template and under a parent. */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;
    const { actor } = ctx;

    try {
      const body = await parseBody(req, createSchema);

      // A parent decides both the tree position and, usually, the space. It
      // must be in this org, and the caller must be able to edit it.
      let spaceId = body.spaceId ?? null;
      if (body.parentPageId) {
        const parent = await db.query.kbPages.findFirst({
          where: and(eq(kbPages.id, body.parentPageId), eq(kbPages.orgId, actor.orgId)),
          columns: { id: true, spaceId: true, deletedAt: true },
        });
        if (!parent || parent.deletedAt) return kbNotFound();

        const decision = await resolvePageAccess(actor, parent.id, "edit");
        if (decision.outcome === "notFound") return kbNotFound();
        if (decision.outcome === "denied") {
          return err("You cannot add a page under this one.", 403);
        }
        if (spaceId !== null && parent.spaceId !== null && spaceId !== parent.spaceId) {
          return err("A child page lives in its parent's space.", 400);
        }
        spaceId = parent.spaceId;
      }

      let defaultVisibility: "private" | "org" | "public" = "org";
      if (spaceId !== null) {
        const space = await db.query.kbSpaces.findFirst({
          where: and(eq(kbSpaces.id, spaceId), eq(kbSpaces.orgId, actor.orgId)),
          columns: { id: true, defaultVisibility: true, archivedAt: true, deletedAt: true },
        });
        if (!space || space.deletedAt) return kbNotFound();
        if (space.archivedAt) return err("This space is archived and is read-only.", 403);

        // Creating in a space takes an editor seat there, or the org-wide
        // permission. Space membership is the usual route (D8).
        const seat = await resolveSpaceRole(actor, space.id);
        const canCreate =
          isKbAdmin(actor) ||
          (actor.permissions ?? []).includes("kb:pages:create") ||
          spaceRoleSatisfies(seat, "edit");
        if (!canCreate) return err("You cannot add pages to this space.", 403);

        defaultVisibility = space.defaultVisibility as typeof defaultVisibility;
      } else if (
        !isKbAdmin(actor) &&
        !(actor.permissions ?? []).includes("kb:pages:create") &&
        !body.parentPageId
      ) {
        // No space and no parent means a loose org-level page.
        return err("Creating a page outside a space needs kb:pages:create.", 403);
      }

      let content = body.content ?? null;
      if (body.templateId) {
        const template = await db.query.kbPageTemplates.findFirst({
          where: and(
            eq(kbPageTemplates.id, body.templateId),
            eq(kbPageTemplates.orgId, actor.orgId),
          ),
          columns: { id: true, content: true },
        });
        if (!template) return kbNotFound();
        content = template.content ?? null;

        await db
          .update(kbPageTemplates)
          .set({
            useCount: sql`${kbPageTemplates.useCount} + 1`,
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(eq(kbPageTemplates.id, template.id), eq(kbPageTemplates.orgId, actor.orgId)),
          );
      }

      const contentText = content ? extractContentText(content) : null;

      const [created] = await db
        .insert(kbPages)
        .values({
          orgId: actor.orgId,
          spaceId,
          parentPageId: body.parentPageId ?? null,
          projectId: body.projectId ?? null,
          title: body.title,
          contentType: body.contentType,
          visibility: body.visibility ?? defaultVisibility,
          content: (content ?? null) as never,
          contentText,
          excerpt: contentText ? buildExcerpt(contentText) : null,
          createdById: actor.userId,
          lastEditedById: actor.userId,
          ownerUserId: actor.userId,
          sortOrder: await nextSortOrder(actor.orgId, body.parentPageId ?? null),
        })
        .returning();

      await createAuditLog({
        action: "kb.page.created",
        userId: actor.userId,
        orgId: actor.orgId,
        targetId: String(created.id),
        targetType: "kb_page",
        metadata: {
          spaceId,
          parentPageId: body.parentPageId ?? null,
          templateId: body.templateId ?? null,
        },
      });

      return ok(created, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid page.", 400);
      throw error;
    }
  }, req);
}

/**
 * The pages this caller can see, newest first. KB-0050 adds the shared scope
 * and KB-0051 the filters, facets and cursor; the visibility predicate is the
 * part that must be right from the start.
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const rows = await db
      .select({
        id: kbPages.id,
        title: kbPages.title,
        icon: kbPages.icon,
        spaceId: kbPages.spaceId,
        status: kbPages.status,
        visibility: kbPages.visibility,
        updatedAt: kbPages.updatedAt,
      })
      .from(kbPages)
      .where(visiblePagesPredicate(ctx.actor))
      .orderBy(desc(kbPages.updatedAt))
      .limit(50);

    return ok({ items: rows });
  }, req);
}
