"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useKbReviews, useKbReviewsDue, type KbPageReview } from "@/lib/api/hooks/knowledge";
import { formatIST } from "@/lib/date-utils";
import { pluralise } from "@/lib/format-utils";
import { pageHref } from "@/lib/knowledge/routes";

import type { BulkDecideResult } from "./reviews-bulk-decide-dialog";
import { ReviewDecisionDialog } from "./reviews-decision-dialogs";
import { ReviewsBulkDecideDialog } from "./reviews-bulk-decide-dialog";
import { ReviewsBulkResultsDialog } from "./reviews-bulk-results-dialog";
import { ReviewsFilters } from "./reviews-filters";
import { ReviewsMobileCard } from "./reviews-mobile-card";

/** KB-0087: the review queue — pending, due and decided. */
export function ReviewsPage({ canDecide = false }: { canDecide?: boolean }) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("pending");
  const [type, setType] = useState<"approval" | "freshness" | null>(null);
  const [reviewerId, setReviewerId] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [deciding, setDeciding] = useState<{
    review: KbPageReview;
    decision: "approve" | "reject";
  } | null>(null);
  const [bulk, setBulk] = useState<"approve" | "reject" | null>(null);
  const [results, setResults] = useState<BulkDecideResult[] | null>(null);

  const filters = {
    type: type ?? undefined,
    reviewerId: reviewerId || undefined,
  };

  const pending = useKbReviews({ ...filters, status: "pending" });
  const due = useKbReviewsDue();
  const decided = useKbReviews({ ...filters, status: "approved" });
  const rejected = useKbReviews({ ...filters, status: "rejected" });

  const rowsFor = (key: string): KbPageReview[] => {
    if (key === "pending") return pending.data?.items ?? [];
    if (key === "due") return due.data?.items ?? [];
    return [...(decided.data?.items ?? []), ...(rejected.data?.items ?? [])];
  };

  const loading =
    (tab === "pending" && pending.isLoading) ||
    (tab === "due" && due.isLoading) ||
    (tab === "decided" && (decided.isLoading || rejected.isLoading));

  const rows = rowsFor(tab);

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  return (
    <PageWrapper
      title="Reviews"
      subtitle="Pages waiting on someone"
      breadcrumbs={false}
      filters={
        <ReviewsFilters
          type={type}
          reviewerId={reviewerId}
          onTypeChange={setType}
          onReviewerChange={setReviewerId}
        />
      }
    >
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value);
          setSelected([]);
        }}
      >
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="due">Due</TabsTrigger>
          <TabsTrigger value="decided">Decided</TabsTrigger>
        </TabsList>

        {["pending", "due", "decided"].map((key) => (
          <TabsContent key={key} value={key} className="mt-4 flex flex-col gap-3">
            {canDecide && selected.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  {pluralise(selected.length, "review")} selected
                </span>
                <Button size="sm" className="ml-auto" onClick={() => setBulk("approve")}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setBulk("reject")}>
                  Reject
                </Button>
              </div>
            ) : null}

            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : rows.length === 0 ? (
              <EmptyState
                title={key === "decided" ? "Nothing decided yet" : "Nothing waiting"}
                description={
                  key === "due"
                    ? "Pages past their review date will show up here."
                    : "Reviews people ask for show up here."
                }
              />
            ) : isMobile ? (
              <div className="flex flex-col gap-3">
                {rows.map((review) => (
                  <ReviewsMobileCard
                    key={review.id}
                    review={review}
                    canDecide={canDecide}
                    onApprove={() => setDeciding({ review, decision: "approve" })}
                    onReject={() => setDeciding({ review, decision: "reject" })}
                  />
                ))}
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canDecide ? <TableHead className="w-10" /> : null}
                      <TableHead className="min-w-[200px]">Page</TableHead>
                      <TableHead className="w-28">Type</TableHead>
                      <TableHead className="w-40">Reviewer</TableHead>
                      <TableHead className="w-28">Due</TableHead>
                      <TableHead className="w-36 text-right">Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableEmpty colSpan={6} message="No reviews match these filters." />
                    ) : (
                      rows.map((review) => (
                        <TableRow key={review.id}>
                          {canDecide ? (
                            <TableCell>
                              <Checkbox
                                checked={selected.includes(review.id)}
                                onCheckedChange={() => toggle(review.id)}
                                aria-label={`Select review ${review.id}`}
                                disabled={review.status !== "pending"}
                              />
                            </TableCell>
                          ) : null}
                          <TableCell className="font-medium text-foreground">
                            <Link href={pageHref(review.pageId)} className="truncate">
                              {review.pageTitle ?? `Page ${review.pageId}`}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={review.type === "freshness" ? "info" : "neutral"}>
                              {review.type === "freshness" ? "Freshness" : "Approval"}
                            </StatusPill>
                          </TableCell>
                          <TableCell className="truncate text-muted-foreground">
                            {review.reviewerName ?? "Anyone who can approve"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {review.dueAt
                              ? formatIST(review.dueAt, { day: "numeric", month: "short" })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {review.status === "pending" && canDecide ? (
                              <span className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => setDeciding({ review, decision: "approve" })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setDeciding({ review, decision: "reject" })}
                                >
                                  Reject
                                </Button>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {review.status === "approved"
                                  ? "Approved"
                                  : review.status === "rejected"
                                    ? "Rejected"
                                    : "Pending"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ReviewDecisionDialog
        review={deciding?.review ?? null}
        decision={deciding?.decision ?? "approve"}
        onOpenChange={(open) => !open && setDeciding(null)}
      />
      <ReviewsBulkDecideDialog
        ids={selected}
        decision={bulk ?? "approve"}
        open={!!bulk}
        onOpenChange={(open) => !open && setBulk(null)}
        onResults={(rowResults) => {
          setResults(rowResults);
          setSelected([]);
        }}
      />
      <ReviewsBulkResultsDialog
        results={results}
        onOpenChange={(open) => !open && setResults(null)}
      />
    </PageWrapper>
  );
}
