"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, ListTodo, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { useCycleDetail } from "@/lib/api/hooks/projects/cycle-detail";
import { isDoneStatus } from "@/lib/projects/project-health";
import { CompleteCycleDialog } from "./complete-cycle-dialog";
import { canCompletePeriod, PERIOD_STATUS_LABEL, periodStatus } from "@/lib/projects/period-status";

export function CycleDetailView({ projectId, cycleId, canEdit }: { projectId: number; cycleId: number; canEdit: boolean }) {
  const { data, isLoading, isError } = useCycleDetail(projectId, cycleId);
  const [completing, setCompleting] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        title="This cycle doesn't exist, or you don't have access"
        description="It may have been deleted."
        action={{ label: "Back to cycles", href: `/projects/${projectId}/cycles` }}
      />
    );
  }

  const { cycle, stats, tickets, velocity } = data;
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const maxVelocity = Math.max(1, ...velocity.map((v) => v.points));
  // Status follows the dates: a cycle whose start had passed still read
  // "Upcoming", and a draft offered "Complete cycle" (QA-0075).
  const derivedStatus = periodStatus({
    storedStatus: cycle.status,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(cycle.startDate), "MMM d")} to {format(new Date(cycle.endDate), "MMM d, yyyy")} ·{" "}
            {PERIOD_STATUS_LABEL[derivedStatus]}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Progress value={pct} className="h-2 w-48" aria-label={`${pct}% done`} />
            <span className="text-sm tabular-nums text-muted-foreground">{pct}%</span>
          </div>
        </div>
        {canEdit && canCompletePeriod(derivedStatus) && (
          <Button onClick={() => setCompleting(true)}>Complete cycle</Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tickets" value={stats.total} icon={ListTodo} index={0} />
        <StatCard label="Done" value={stats.done} icon={CheckCircle2} index={1} />
        <StatCard label="Points planned" value={stats.points} icon={Target} index={2} />
        <StatCard label="Points done" value={stats.donePoints} icon={TrendingUp} index={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card lg:col-span-2">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Tickets in this cycle</h2>
          {tickets.length === 0 ? (
            <div className="px-4 py-12">
              <EmptyState icon={ListTodo} title="No tickets in this cycle" description="Set a ticket's cycle from its detail pane to plan it here." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/projects/${projectId}?ticket=${t.id}`}
                    className="flex min-h-12 items-center gap-3 px-4 text-sm hover:bg-muted focus-visible:focus-ring"
                  >
                    <CheckCircle2 className={isDoneStatus(t.status) ? "size-4 text-success-strong" : "size-4 text-muted-foreground"} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{t.assigneeName ?? "Unassigned"}</span>
                    <span className="w-24 text-right text-xs text-muted-foreground">{t.status.replace(/_/g, " ").toLowerCase()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold">Velocity</h2>
          <p className="mb-4 text-xs text-muted-foreground">Points finished in the last completed cycles</p>
          {velocity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Complete a cycle to see velocity.</p>
          ) : (
            <ol className="space-y-2">
              {/* The name column was six rems and clipped (QA-0074). */}
              {velocity.map((v) => (
                <li key={v.cycleId} className="grid grid-cols-[minmax(6rem,10rem)_1fr_2.5rem] items-center gap-2 text-xs">
                  <span className="truncate text-muted-foreground" title={v.name}>{v.name}</span>
                  <span className="h-2 rounded-full bg-muted">
                    <span className="block h-2 rounded-full bg-primary" style={{ width: `${(v.points / maxVelocity) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{v.points}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {completing && <CompleteCycleDialog open={completing} onOpenChange={setCompleting} projectId={projectId} detail={data} />}
    </div>
  );
}
