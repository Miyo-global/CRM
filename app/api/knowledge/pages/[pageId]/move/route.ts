import type { NextRequest } from "next/server";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { db } from "@/lib/db";
import { kbPages, kbSpaces } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { resolveSpaceRole, spaceRoleSatisfies } from "@/lib/knowledge/space-access";
import { getSubtreeIds, wouldCreateCycle } from "@/lib/knowledge/tree";
import { isKbAdmin } from "@/lib/knowledge/authorization";

const moveSchema = z
  .object({
    parentPageId: z.coerce.number().int().positive().nullable(),
    spaceId: z.coerce.number().int().positive().nullable().optional(),
    index: z.coerce.number().int().min(0).max(10_000).optional(),
  })
  .strict();

/**
 * KB-0041: move a page and renumber its new siblings.
 *
 * The cycle check is the whole point: a page moved under its own descendant
 * makes a loop that every tree walk then has to survive, so it is refused here
 * rather than guarded everywhere else.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await context.params;
  return withAuth(async (session) => {
    const ctx = await kbContext(session);
    if ("response" in ctx) return ctx.response;

    const id = Number(pageId);
    const decision = await resolvePageAccess(ctx.actor, id, "edit");
    if (decision.outcome === "notFound") return kbNotFound();
    if (decision.outcome === "denied") return kbDenied();

    try {
      const body = await parseBody(req, moveSchema);

      const page = await db.query.kbPages.findFirst({
        where: and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)),
        columns: { id: true, spaceId: true, parentPageId: true },
      });
      if (!page) return kbNotFound();

      let targetSpaceId = body.spaceId === undefined ? page.spaceId : body.spaceId;

      if (body.parentPageId !== null) {
        const parent = await db.query.kbPages.findFirst({
          where: and(eq(kbPages.id, body.parentPageId), eq(kbPages.orgId, session.orgId)),
          columns: { id: true, spaceId: true, deletedAt: true },
        });
        if (!parent || parent.deletedAt) return kbNotFound();

        const parentAccess = await resolvePageAccess(ctx.actor, parent.id, "edit");
        if (parentAccess.outcome !== "allowed") return kbDenied();

        if (await wouldCreateCycle(session.orgId, id, parent.id)) {
          return err("A page cannot be moved underneath itself.", 400);
        }
        targetSpaceId = parent.spaceId;
      }

      // Moving across spaces takes edit in the destination too, or the page
      // would arrive somewhere the mover cannot write.
      if (targetSpaceId !== page.spaceId && targetSpaceId !== null) {
        const space = await db.query.kbSpaces.findFirst({
          where: and(eq(kbSpaces.id, targetSpaceId), eq(kbSpaces.orgId, session.orgId)),
          columns: { id: true, archivedAt: true, deletedAt: true },
        });
        if (!space || space.deletedAt) return kbNotFound();
        if (space.archivedAt) return err("That space is archived and is read-only.", 403);

        const seat = await resolveSpaceRole(ctx.actor, space.id);
        if (!isKbAdmin(ctx.actor) && !spaceRoleSatisfies(seat, "edit")) {
          return err("You cannot move a page into that space.", 403);
        }
      }

      // The subtree follows the page, so its descendants' spaces move too.
      const subtree = await getSubtreeIds(session.orgId, id);

      const siblings = await db
        .select({ id: kbPages.id, sortOrder: kbPages.sortOrder })
        .from(kbPages)
        .where(
          and(
            eq(kbPages.orgId, session.orgId),
            body.parentPageId === null
              ? isNull(kbPages.parentPageId)
              : eq(kbPages.parentPageId, body.parentPageId),
            isNull(kbPages.deletedAt),
            ne(kbPages.id, id),
          ),
        )
        .orderBy(asc(kbPages.sortOrder));

      const index = Math.min(body.index ?? siblings.length, siblings.length);
      const ordered = [...siblings.slice(0, index), { id, sortOrder: 0 }, ...siblings.slice(index)];

      for (const [position, sibling] of ordered.entries()) {
        await db
          .update(kbPages)
          .set({
            sortOrder: position,
            ...(sibling.id === id
              ? {
                  parentPageId: body.parentPageId,
                  spaceId: targetSpaceId,
                  updatedAt: new Date(),
                  lastEditedById: session.user.id,
                }
              : {}),
          })
          .where(and(eq(kbPages.id, sibling.id), eq(kbPages.orgId, session.orgId)));
      }

      if (targetSpaceId !== page.spaceId && subtree.length > 1) {
        for (const descendant of subtree.filter((pid) => pid !== id)) {
          await db
            .update(kbPages)
            .set({ spaceId: targetSpaceId, updatedAt: new Date() })
            .where(and(eq(kbPages.id, descendant), eq(kbPages.orgId, session.orgId)));
        }
      }

      await createAuditLog({
        action: "kb.page.moved",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(id),
        targetType: "kb_page",
        metadata: {
          fromParent: page.parentPageId,
          toParent: body.parentPageId,
          fromSpace: page.spaceId,
          toSpace: targetSpaceId,
          index,
          movedDescendants: subtree.length - 1,
        },
      });

      return ok({ id, parentPageId: body.parentPageId, spaceId: targetSpaceId, index });
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid move.", 400);
      throw error;
    }
  }, req);
}
