import type { NextRequest } from "next/server";
import { and, asc, desc, eq, exists, isNull, ne, or, sql } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPageGrants, kbPages, kbPageTemplates, kbSpaces } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import {
  isKbAdmin,
  resolvePageAccess,
  visiblePagesPredicate,
} from "@/lib/knowledge/authorization";
import {
  decodeCursor,
  encodeCursor,
  KB_COLLECTION_SCOPES,
  KB_COLLECTION_SORTS,
  KB_PAGE_STATUSES,
  normalizeSearchTerms,
  parseLimit,
  type KbCollectionScope,
  type KbCollectionSort,
} from "@/lib/knowledge/collection";
import { buildExcerpt, extractContentText } from "@/lib/knowledge/content";
import { escapeLike } from "@/lib/db/escape-like";
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
 * KB-0050, KB-0051, KB-0052: the page collection.
 *
 * Scopes: all, private (mine), shared (granted to me by someone else), space,
 * project. They differ only in the predicate, so one query shape serves them
 * all. Paging is keyset, not OFFSET — a wiki is browsed while people edit it,
 * and an OFFSET page repeats or skips rows when something is inserted above.
 * Facet counts come from one grouped query over the same predicate.
 */
export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;
    const { actor } = ctx;
    const params = req.nextUrl.searchParams;

    const limit = parseLimit(params.get("limit"));
    if (typeof limit !== "number") return err(limit.error, 400);

    const scope = (params.get("scope") ?? "all") as KbCollectionScope;
    if (!KB_COLLECTION_SCOPES.includes(scope)) return err("Unknown scope.", 400);

    const sort = (params.get("sort") ?? "updated") as KbCollectionSort;
    if (!KB_COLLECTION_SORTS.includes(sort)) return err("Unknown sort.", 400);

    const status = params.get("status");
    if (status && !KB_PAGE_STATUSES.includes(status as (typeof KB_PAGE_STATUSES)[number])) {
      return err("Unknown status.", 400);
    }

    const spaceId = Number(params.get("spaceId"));
    const projectId = Number(params.get("projectId"));
    if (scope === "space" && !(Number.isSafeInteger(spaceId) && spaceId > 0)) {
      return err("spaceId is required for the space scope.", 400);
    }
    if (scope === "project" && !(Number.isSafeInteger(projectId) && projectId > 0)) {
      return err("projectId is required for the project scope.", 400);
    }

    const search = normalizeSearchTerms(params.get("q"));
    const ownerId = params.get("ownerId");
    const contentType = params.get("contentType");

    const scopePredicates = [visiblePagesPredicate(actor)];
    if (scope === "private") scopePredicates.push(eq(kbPages.createdById, actor.userId));
    if (scope === "space") scopePredicates.push(eq(kbPages.spaceId, spaceId));
    if (scope === "project") scopePredicates.push(eq(kbPages.projectId, projectId));
    if (scope === "shared") {
      // Shared with me: a live grant to me or my role, on a page I did not make.
      scopePredicates.push(
        ne(kbPages.createdById, actor.userId),
        exists(
          db
            .select({ one: kbPageGrants.id })
            .from(kbPageGrants)
            .where(
              and(
                eq(kbPageGrants.orgId, actor.orgId),
                eq(kbPageGrants.pageId, kbPages.id),
                isNull(kbPageGrants.revokedAt),
                actor.role
                  ? or(
                      eq(kbPageGrants.userId, actor.userId),
                      eq(kbPageGrants.role, actor.role),
                    )
                  : eq(kbPageGrants.userId, actor.userId),
              ),
            ),
        ),
      );
    }
    if (status) scopePredicates.push(eq(kbPages.status, status as "draft"));
    if (contentType) scopePredicates.push(eq(kbPages.contentType, contentType as "note"));
    if (ownerId) scopePredicates.push(eq(kbPages.ownerUserId, ownerId));
    if (search) {
      scopePredicates.push(
        sql`${kbPages.title} ILIKE ${"%" + escapeLike(search) + "%"}`,
      );
    }

    const where = and(...scopePredicates);

    const cursor = decodeCursor(params.get("cursor"));
    const sortColumn =
      sort === "created"
        ? kbPages.createdAt
        : sort === "title"
          ? kbPages.title
          : sort === "views"
            ? kbPages.views
            : kbPages.updatedAt;

    // Keyset: strictly past the last row's sort value, with the id as the
    // tie-break so equal values cannot loop.
    const paged = cursor
      ? and(
          where,
          sort === "title"
            ? or(
                sql`${sortColumn} > ${cursor.value}`,
                and(sql`${sortColumn} = ${cursor.value}`, sql`${kbPages.id} > ${cursor.id}`),
              )
            : or(
                sql`${sortColumn} < ${cursor.value}`,
                and(sql`${sortColumn} = ${cursor.value}`, sql`${kbPages.id} < ${cursor.id}`),
              ),
        )
      : where;

    const order = sort === "title" ? [asc(kbPages.title), asc(kbPages.id)] : [desc(sortColumn), desc(kbPages.id)];

    const rows = await db
      .select({
        id: kbPages.id,
        title: kbPages.title,
        icon: kbPages.icon,
        spaceId: kbPages.spaceId,
        projectId: kbPages.projectId,
        status: kbPages.status,
        contentType: kbPages.contentType,
        visibility: kbPages.visibility,
        trustState: kbPages.trustState,
        ownerUserId: kbPages.ownerUserId,
        excerpt: kbPages.excerpt,
        views: kbPages.views,
        createdAt: kbPages.createdAt,
        updatedAt: kbPages.updatedAt,
      })
      .from(kbPages)
      .where(paged)
      .orderBy(...order)
      .limit(limit);

    const facets = await db
      .select({
        status: kbPages.status,
        contentType: kbPages.contentType,
        count: sql<number>`count(*)::int`,
      })
      .from(kbPages)
      .where(where)
      .groupBy(kbPages.status, kbPages.contentType);

    const last = rows[rows.length - 1];
    const cursorValue = (row: typeof last): string => {
      if (!row) return "";
      if (sort === "title") return row.title;
      if (sort === "views") return String(row.views ?? 0);
      return (sort === "created" ? row.createdAt : row.updatedAt).toISOString();
    };

    return ok({
      items: rows,
      nextCursor:
        rows.length === limit && last
          ? encodeCursor({ id: last.id, value: cursorValue(last) })
          : null,
      facets: {
        status: Object.fromEntries(
          Object.entries(
            facets.reduce<Record<string, number>>((acc, row) => {
              acc[row.status] = (acc[row.status] ?? 0) + Number(row.count);
              return acc;
            }, {}),
          ),
        ),
        contentType: facets.reduce<Record<string, number>>((acc, row) => {
          acc[row.contentType] = (acc[row.contentType] ?? 0) + Number(row.count);
          return acc;
        }, {}),
      },
    });
  }, req);
}
