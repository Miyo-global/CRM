"use client";

import { format } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatusPill } from "@/components/ui/status-pill";
import { useHrGoals, useHrPerformanceReviews } from "@/lib/api/hooks/hr/leaves-expenses";

const day = (d: string) => format(new Date(d), "MMM d, yyyy");

function Loading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

/**
 * QA P2-emp-no-own-performance-view: the employee's own completed reviews and
 * goals. Read-only; the APIs scope a non-admin to their own released rows.
 */
export default function MyReviewsPage() {
  const reviews = useHrPerformanceReviews();
  const goals = useHrGoals();

  return (
    <PageWrapper title="My reviews" subtitle="Your completed performance reviews and goals.">
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Reviews</h2>
          {reviews.isLoading ? (
            <Loading />
          ) : reviews.isError ? (
            <QueryErrorState title="Couldn't load your reviews" error={reviews.error} onRetry={() => reviews.refetch()} />
          ) : !reviews.data?.length ? (
            <EmptyState
              title="No completed reviews yet"
              description="When a review about you is completed, it will appear here."
            />
          ) : (
            reviews.data.map((r) => (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {r.cycle?.name ?? "Review"} · {day(r.periodStart)} – {day(r.periodEnd)}
                  </CardTitle>
                  {r.overallRating ? (
                    <StatusPill tone="info">Overall {Number(r.overallRating).toFixed(1)}</StatusPill>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {r.reviewer?.name ? <p className="text-muted-foreground">Reviewer: {r.reviewer.name}</p> : null}
                  {r.ratings?.length ? (
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {r.ratings.map((x) => (
                        <li key={x.category} className="flex justify-between gap-2">
                          <span>{x.category}</span>
                          <span className="tabular-nums font-medium">{x.score}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {r.strengths ? <p><span className="font-medium">Strengths: </span>{r.strengths}</p> : null}
                  {r.improvements ? <p><span className="font-medium">To improve: </span>{r.improvements}</p> : null}
                  {r.comments ? <p className="whitespace-pre-wrap">{r.comments}</p> : null}
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Goals</h2>
          {goals.isLoading ? (
            <Loading />
          ) : goals.isError ? (
            <QueryErrorState title="Couldn't load your goals" error={goals.error} onRetry={() => goals.refetch()} />
          ) : !goals.data?.length ? (
            <EmptyState title="No goals assigned" description="Goals HR or your manager sets for you will appear here." />
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {goals.data.map((g) => (
                  <div key={g.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium break-words">{g.title}</p>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {day(g.startDate)} – {day(g.endDate)}
                      </span>
                    </div>
                    <Progress value={g.progress ?? 0} aria-label={`${g.title} progress`} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
