"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design/tones";

interface RoadmapMilestone {
  id: number;
  name: string;
  targetDate: string;
  status: "PENDING" | "ACHIEVED" | "MISSED";
  projectId: number;
  projectName: string;
  projectKey: string;
  ticketCount: number;
  doneCount: number;
  percentDone: number;
}

const STATUS_TONE: Record<RoadmapMilestone["status"], Tone> = {
  PENDING: "neutral",
  ACHIEVED: "success",
  MISSED: "danger",
};

/** Month buckets, oldest first, covering every milestone in the list. */
function monthsBetween(dates: Date[]): string[] {
  if (dates.length === 0) return [];
  const keys = dates.map((d) => d.getFullYear() * 12 + d.getMonth());
  const months: string[] = [];
  for (let k = Math.min(...keys); k <= Math.max(...keys); k++) {
    months.push(`${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}`);
  }
  return months;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * MIYO-0115: one timeline of the milestones of every project the viewer can
 * see, a month per column and a project per row.
 */
export default function RoadmapPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...queryKeys.projects.all, "roadmap"] as const,
    queryFn: () => apiClient.get<RoadmapMilestone[]>("/projects/roadmap"),
  });

  const milestones = useMemo(() => data ?? [], [data]);

  const months = useMemo(
    () => monthsBetween(milestones.map((m) => new Date(m.targetDate))),
    [milestones],
  );

  const byProject = useMemo(() => {
    const map = new Map<number, { name: string; key: string; items: RoadmapMilestone[] }>();
    for (const m of milestones) {
      const entry = map.get(m.projectId) ?? { name: m.projectName, key: m.projectKey, items: [] };
      entry.items.push(m);
      map.set(m.projectId, entry);
    }
    return [...map.entries()];
  }, [milestones]);

  if (isLoading) {
    return (
      <PageWrapper title="Roadmap">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Roadmap"
      subtitle={`${milestones.length} milestone${milestones.length !== 1 ? "s" : ""} across ${byProject.length} project${byProject.length !== 1 ? "s" : ""}`}
    >
      {isError ? (
        <QueryErrorState title="Couldn't load the roadmap" error={error} onRetry={() => refetch()} />
      ) : milestones.length === 0 ? (
        <EmptyState
          title="No milestones yet"
          description="Milestones you add to a project appear here, on one timeline."
        />
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${Math.max(640, 160 + months.length * 120)}px` }}>
            <div
              className="grid border-b border-border pb-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ gridTemplateColumns: `160px repeat(${months.length}, minmax(120px, 1fr))` }}
            >
              <div>Project</div>
              {months.map((m) => (
                <div key={m} className="px-1">
                  {format(new Date(`${m}-01T00:00:00`), "MMM yy")}
                </div>
              ))}
            </div>

            {byProject.map(([projectId, project]) => (
              <div
                key={projectId}
                className="grid items-start border-b border-border py-3"
                style={{ gridTemplateColumns: `160px repeat(${months.length}, minmax(120px, 1fr))` }}
              >
                <div className="pr-3">
                  <Link
                    href={`/projects/${projectId}`}
                    className="text-sm font-medium hover:underline"
                    title={project.name}
                  >
                    {project.name}
                  </Link>
                  <p className="font-mono text-2xs text-muted-foreground">{project.key}</p>
                </div>

                {months.map((month) => {
                  const inMonth = project.items.filter(
                    (m) => monthKey(new Date(m.targetDate)) === month,
                  );
                  return (
                    <div key={month} className="space-y-1 px-1">
                      {inMonth.map((m) => (
                        <Card key={m.id} className="border-border">
                          <CardContent className="space-y-1 p-2">
                            <p className="line-clamp-2 text-xs font-medium" title={m.name}>
                              {m.name}
                            </p>
                            <p className="text-2xs tabular-nums text-muted-foreground">
                              {format(new Date(m.targetDate), "MMM d")}
                              {m.ticketCount > 0 ? ` · ${m.doneCount}/${m.ticketCount}` : ""}
                            </p>
                            <StatusPill tone={STATUS_TONE[m.status]} dot>
                              {m.status === "PENDING"
                                ? "Pending"
                                : m.status === "ACHIEVED"
                                  ? "Achieved"
                                  : "Missed"}
                            </StatusPill>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className={cn("mt-3 text-xs text-muted-foreground")}>
        Milestones are the releases tickets ship in; the counts are the tickets assigned to each.
      </p>
    </PageWrapper>
  );
}
