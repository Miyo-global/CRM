/**
 * KB-0060: review decisions.
 *
 * Two kinds, and they mean different things on approval: an *approval* review
 * publishes the page, a *freshness* review re-verifies it and pushes the next
 * review out. Rejection sends it back to draft either way, with a note, since a
 * rejection without a reason is just a bounce.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbPages, kbPageReviews } from "@/lib/db/schema";

import { verifiedUntil } from "./page-status";

export interface ReviewDecisionResult {
  reviewId: number;
  pageId: number;
  status: "approved" | "rejected";
  pageStatus?: string;
}

/** Applies an approval, and the page change that goes with its kind. */
export async function approveReview(
  orgId: string,
  reviewId: number,
  reviewerId: string,
  note: string | null,
): Promise<ReviewDecisionResult | null> {
  const review = await db.query.kbPageReviews.findFirst({
    where: and(eq(kbPageReviews.id, reviewId), eq(kbPageReviews.orgId, orgId)),
    columns: { id: true, pageId: true, type: true, status: true },
  });
  if (!review || review.status !== "pending") return null;

  const page = await db.query.kbPages.findFirst({
    where: and(eq(kbPages.id, review.pageId), eq(kbPages.orgId, orgId)),
    columns: { id: true, reviewIntervalDays: true },
  });
  if (!page) return null;

  const now = new Date();

  if (review.type === "approval") {
    await db
      .update(kbPages)
      .set({ status: "published", publishedAt: now, updatedAt: now })
      .where(and(eq(kbPages.id, page.id), eq(kbPages.orgId, orgId)));
  } else {
    const until = verifiedUntil(now, page.reviewIntervalDays);
    await db
      .update(kbPages)
      .set({
        trustState: "verified",
        verifiedById: reviewerId,
        verifiedAt: now,
        verifiedUntil: until,
        nextReviewAt: until,
        updatedAt: now,
      })
      .where(and(eq(kbPages.id, page.id), eq(kbPages.orgId, orgId)));
  }

  await db
    .update(kbPageReviews)
    .set({
      status: "approved",
      reviewerId,
      decidedAt: now,
      decisionNote: note,
      updatedAt: now,
    })
    .where(and(eq(kbPageReviews.id, reviewId), eq(kbPageReviews.orgId, orgId)));

  return {
    reviewId,
    pageId: page.id,
    status: "approved",
    pageStatus: review.type === "approval" ? "published" : undefined,
  };
}

/** A rejection returns the page to draft and keeps the reviewer's reason. */
export async function rejectReview(
  orgId: string,
  reviewId: number,
  reviewerId: string,
  note: string,
): Promise<ReviewDecisionResult | null> {
  const review = await db.query.kbPageReviews.findFirst({
    where: and(eq(kbPageReviews.id, reviewId), eq(kbPageReviews.orgId, orgId)),
    columns: { id: true, pageId: true, status: true, type: true },
  });
  if (!review || review.status !== "pending") return null;

  const now = new Date();

  if (review.type === "approval") {
    await db
      .update(kbPages)
      .set({ status: "draft", updatedAt: now })
      .where(and(eq(kbPages.id, review.pageId), eq(kbPages.orgId, orgId)));
  }

  await db
    .update(kbPageReviews)
    .set({
      status: "rejected",
      reviewerId,
      decidedAt: now,
      decisionNote: note,
      updatedAt: now,
    })
    .where(and(eq(kbPageReviews.id, reviewId), eq(kbPageReviews.orgId, orgId)));

  return { reviewId, pageId: review.pageId, status: "rejected", pageStatus: "draft" };
}
