"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { KbPageReview } from "@/lib/api/hooks/knowledge";
import { formatIST } from "@/lib/date-utils";
import { pageHref } from "@/lib/knowledge/routes";

/** KB-0087: a review as a card, which is what a phone gets instead of the table. */
export function ReviewsMobileCard({
  review,
  canDecide,
  onApprove,
  onReject,
}: {
  review: KbPageReview;
  canDecide: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <Link href={pageHref(review.pageId)} className="font-medium text-foreground">
          {review.pageTitle ?? `Page ${review.pageId}`}
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <StatusPill tone={review.type === "freshness" ? "info" : "neutral"}>
            {review.type === "freshness" ? "Freshness" : "Approval"}
          </StatusPill>
          {review.reviewerName ? <span>{review.reviewerName}</span> : null}
          {review.dueAt ? (
            <span>due {formatIST(review.dueAt, { day: "numeric", month: "short" })}</span>
          ) : null}
        </div>

        {review.decisionNote ? (
          <p className="text-sm text-muted-foreground">{review.decisionNote}</p>
        ) : null}

        {canDecide && review.status === "pending" ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={onApprove}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" onClick={onReject}>
              Reject
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
