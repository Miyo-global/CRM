"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceAllocation } from "@/lib/api/hooks/projects";
import { EmptyState } from "@/components/ui/empty-state";
import { TAG_TONE_CYCLE, toneDot } from "@/lib/design/tones";

const PROJECT_COLORS = TAG_TONE_CYCLE.map((t) => toneDot[t]);

function getInitials(name: string | null, email: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

export default function ResourceAllocationPage() {
  const { data: entries, isLoading, isError, error, refetch } = useResourceAllocation();

  const maxTickets = entries ? Math.max(...entries.map((e) => e.totalOpen), 1) : 1;
  const totalOpen = entries?.reduce((sum, e) => sum + e.totalOpen, 0) ?? 0;
  const projectCount = new Set(entries?.flatMap((e) => e.byProject.map((p) => p.projectId))).size;

  return (
    <PageWrapper
      title="Resource Allocation"
      subtitle="Open ticket distribution across team members and active projects"
      badge={entries?.length ? String(entries.length) : undefined}
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          title="No open tickets assigned yet"
          description="Open tickets will appear here once they are assigned to team members."
        />
      ) : (
        <div className="space-y-4">
          <StatsStrip
            items={[
              { label: "Team members", value: entries.length },
              { label: "Open tickets", value: totalOpen },
              { label: "Projects", value: projectCount },
              { label: "Max per person", value: maxTickets },
            ]}
          />
          <div className="space-y-3">
          {entries.map((entry, idx) => {
            const utilPct = Math.round((entry.totalOpen / maxTickets) * 100);
            return (
              <Card key={entry.user.id} className="p-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={entry.user.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(entry.user.name, entry.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{entry.user.name ?? entry.user.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{entry.user.email}</p>
                        </div>
                        <StatusPill
                          tone={entry.totalOpen > 10 ? "danger" : entry.totalOpen > 5 ? "warning" : "neutral"}
                          className="shrink-0 tabular-nums"
                        >
                          {entry.totalOpen} open
                        </StatusPill>
                      </div>
                      <Progress value={utilPct} className="mb-3 h-1.5" />
                      <div className="flex flex-wrap gap-1.5">
                        {entry.byProject.map((p, pIdx) => (
                          <div
                            key={p.projectId}
                            className="flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs"
                          >
                            <span
                              aria-hidden="true"
                              className={`size-2 shrink-0 rounded-full ${PROJECT_COLORS[(pIdx + idx) % PROJECT_COLORS.length]}`}
                            />
                            <span className="font-mono text-2xs text-muted-foreground">{p.projectKey}</span>
                            <span className="truncate">{p.projectName}</span>
                            <span className="font-semibold tabular-nums">{p.open}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
              </Card>
            );
          })}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
