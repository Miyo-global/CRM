import type { NextRequest } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPageLinks } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import {
  availableRecordLinkTargets,
  checkRecordTarget,
  isRecordLinkTarget,
  recordHref,
  RECORD_LINK_TARGET_TYPES,
  type RecordLinkTargetType,
} from "@/lib/knowledge/record-links";

const createSchema = z
  .object({
    targetType: z.enum(RECORD_LINK_TARGET_TYPES),
    targetId: z.string().trim().min(1).max(64),
    label: z.string().trim().max(200).optional(),
  })
  .strict();

/** KB-0059: the CRM records this page is linked to. */
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
      .select({
        id: kbPageLinks.id,
        targetType: kbPageLinks.targetType,
        targetId: kbPageLinks.targetId,
        label: kbPageLinks.label,
        createdAt: kbPageLinks.createdAt,
      })
      .from(kbPageLinks)
      .where(
        and(
          eq(kbPageLinks.orgId, session.orgId),
          eq(kbPageLinks.sourcePageId, id),
          isNotNull(kbPageLinks.targetId),
        ),
      )
      .limit(100);

    return ok({
      items: rows
        .filter((row) => isRecordLinkTarget(row.targetType))
        .map((row) => ({
          ...row,
          href: recordHref(row.targetType as RecordLinkTargetType, row.targetId ?? ""),
        })),
      available: availableRecordLinkTargets(),
    });
  }, req);
}

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
      const body = await parseBody(req, createSchema);

      // Checked before it is stored: a link to a record that is not there looks
      // authoritative on the page and is worse than no link.
      const check = await checkRecordTarget(session.orgId, body.targetType, body.targetId);
      if (!check.ok) return err(check.message, check.status);

      const inserted = await db
        .insert(kbPageLinks)
        .values({
          orgId: session.orgId,
          sourcePageId: id,
          targetPageId: null,
          targetType: body.targetType,
          targetId: body.targetId,
          label: body.label ?? null,
        })
        .onConflictDoNothing()
        .returning();

      const created = inserted[0];
      if (!created) return err("That record is already linked to this page.", 409);

      return ok(created, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid link.", 400);
      throw error;
    }
  }, req);
}
