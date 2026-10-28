"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleDot, Clock, HeartPulse } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useProjectActivity, useProjectOverview } from "@/lib/api/hooks/projects/activity";
import { ActivityList } from "@/features/projects/activity/activity-list";
import { AttentionList } from "./attention-list";
import { ProjectUpdates } from "./project-updates";
import { useProject } from "@/lib/api/hooks/projects";

const HEALTH_LABEL = { on_track: "On track", at_risk: "At risk", off_track: "Off track" } as const;

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function ProjectOverview({ projectId }: { projectId: number }) {
  const router = useRouter();
  const overview = useProjectOverview(projectId);
  const { data: project } = useProject(projectId);
  const activity = useProjectActivity(projectId);

  if (overview.isLoading) return <OverviewSkeleton />;
  if (overview.isError || !overview.data) {
    return <QueryErrorState error={overview.error} onRetry={() => overview.refetch()} />;
  }

  const { counts, health, attention, projectKey } = overview.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Open" value={counts.open} icon={CircleDot} index={0} />
        <StatCard label="In progress" value={counts.inProgress} icon={Clock} index={1} />
        <StatCard label="Overdue" value={counts.overdue} icon={AlertTriangle} index={2} />
        <StatCard label="Done this week" value={counts.doneThisWeek} icon={CheckCircle2} index={3} />
        <StatCard
          label="Health"
          value={HEALTH_LABEL[health.status]}
          valueTooltip={`${health.donePct}% of tickets done`}
          icon={HeartPulse}
          index={4}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <AttentionList title="Overdue" items={attention.overdue} projectId={projectId} projectKey={projectKey} empty="Nothing is overdue." />
        <AttentionList
          title="Urgent and unassigned"
          items={attention.unassignedUrgent}
          projectId={projectId}
          projectKey={projectKey}
          empty="Every high priority ticket has an owner."
        />
        <AttentionList
          title="No movement for a week"
          items={attention.stale}
          projectId={projectId}
          projectKey={projectKey}
          empty="All work in progress moved this week."
        />
      </div>

      <ProjectUpdates
        projectId={projectId}
        canPost={project?.viewerRole === "OWNER" || project?.viewerRole === "MANAGER"}
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent activity</h2>
        <ActivityList
          query={activity}
          showTicket
          projectKey={projectKey ?? undefined}
          onTicketClick={(ticketId) => router.push(`/projects/${projectId}?ticket=${ticketId}`)}
        />
      </section>
    </div>
  );
}
