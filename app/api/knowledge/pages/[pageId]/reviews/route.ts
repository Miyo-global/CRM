import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { err, ok, parseBody, withAuth } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { kbPages, kbPageReviews } from "@/lib/db/schema";
import { kbContext } from "@/lib/knowledge/actor";
import { resolvePageAccess } from "@/lib/knowledge/authorization";
import { kbDenied, kbNotFound } from "@/lib/knowledge/errors";
import { sendNotification } from "@/lib/notifications/send";
import { pageHref } from "@/lib/knowledge/routes";

const createSchema = z
  .object({
    type: z.enum(["approval", "freshness"]).default("approval"),
    reviewerId: z.string().trim().max(64).optional(),
    dueAt: z.coerce.date().optional(),
  })
  .strict();

/** KB-0060: ask for a review. An approval request moves the page to in_review. */
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

      const existing = await db.query.kbPageReviews.findFirst({
        where: and(
          eq(kbPageReviews.orgId, session.orgId),
          eq(kbPageReviews.pageId, id),
          eq(kbPageReviews.status, "pending"),
          eq(kbPageReviews.type, body.type),
        ),
        columns: { id: true },
      });
      if (existing) return err("A review of that kind is already open on this page.", 409);

      const [created] = await db
        .insert(kbPageReviews)
        .values({
          orgId: session.orgId,
          pageId: id,
          type: body.type,
          requestedById: session.user.id,
          reviewerId: body.reviewerId ?? null,
          dueAt: body.dueAt ?? null,
        })
        .returning();

      if (body.type === "approval") {
        await db
          .update(kbPages)
          .set({ status: "in_review", updatedAt: new Date() })
          .where(and(eq(kbPages.id, id), eq(kbPages.orgId, session.orgId)));
      }

      if (body.reviewerId) {
        void sendNotification({
          orgId: session.orgId,
          userId: body.reviewerId,
          type: "INFO",
          title: "A page is waiting for your review",
          message: "You were asked to review a Knowledge Base page.",
          link: pageHref(id),
          channel: "both",
          metadata: { pageId: id, kind: "knowledge.page.review_requested" },
        });
      }

      return ok(created, 201);
    } catch (error) {
      if (error instanceof ZodError) return err(error.issues[0]?.message ?? "Invalid review.", 400);
      throw error;
    }
  }, req);
}
