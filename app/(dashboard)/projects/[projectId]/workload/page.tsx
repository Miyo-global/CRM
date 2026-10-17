"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSprints } from "@/lib/api/hooks/projects";
import { resolveImageUrl } from "@/lib/utils";

interface WorkloadRow {
  userId: string | null;
  name: string | null;
  image: string | null;
  openTickets: number;
  doneTickets: number;
  points: number;
  estimateHours: number;
  loggedHours: number;
}

/**
 * MIYO-0120: who is carrying what on this project, with the hours per person
 * for the whole project or one sprint.
 */
export default function WorkloadPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);
  const [sprintId, setSprintId] = useState("all");

  const { data: sprints } = useSprints(projectId);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...queryKeys.projects.detail(projectId), "workload", sprintId] as const,
    queryFn: () =>
      apiClient.get<WorkloadRow[]>(
        `/projects/${projectId}/workload${sprintId === "all" ? "" : `?sprintId=${sprintId}`}`,
      ),
    enabled: !!projectId,
  });

  const rows = data ?? [];
  const busiest = Math.max(1, ...rows.map((r) => r.estimateHours));

  return (
    <PageWrapper
      title="Workload"
      subtitle="Open work per person, by estimated hours"
      actions={
        <Select value={sprintId} onValueChange={setSprintId}>
          <SelectTrigger className="h-9 w-56" aria-label="Sprint">
            <SelectValue placeholder="All sprints" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sprints</SelectItem>
            {(sprints ?? []).map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
                {s.status === "ACTIVE" ? " (Active)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState title="Couldn't load the workload" error={error} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No work to show" description="Tickets in this project will appear here." />
      ) : (
        <div className="overflow-x-auto">
          <Table className="tabular-nums">
            <caption className="sr-only">Workload per assignee</caption>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead scope="col">Person</TableHead>
                <TableHead className="w-[30%]" scope="col">Estimated hours</TableHead>
                <TableHead className="text-right" scope="col">Open</TableHead>
                <TableHead className="text-right" scope="col">Done</TableHead>
                <TableHead className="text-right" scope="col">Points</TableHead>
                <TableHead className="text-right" scope="col">Logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.userId ?? "unassigned"}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {row.userId ? (
                        <Avatar className="size-6">
                          <AvatarImage src={resolveImageUrl(row.image)} />
                          <AvatarFallback className="bg-brand-soft text-3xs">
                            {(row.name ?? "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                      <span className="text-sm font-medium">
                        {row.userId ? (row.name ?? "Unknown") : "Unassigned"}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={(row.estimateHours / busiest) * 100}
                        aria-label={`${row.estimateHours} estimated hours`}
                      />
                      <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                        {row.estimateHours}h
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{row.openTickets}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.doneTickets}</TableCell>
                  <TableCell className="text-right">{row.points}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.loggedHours}h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
