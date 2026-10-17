"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { StatsStrip } from "@/components/shared/stats-strip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TicketTypeIcon } from "@/components/projects/shared/ticket-type-icon";
import { PriorityBadge } from "@/components/projects/shared/priority-badge";
import { StatusBadge } from "@/components/projects/shared/status-badge";
import { TicketFilterBar } from "@/components/projects/shared/ticket-filter-bar";
import { ticketKey } from "@/lib/projects/ticket-key";
import { useMyWork } from "@/lib/hooks/trpc-hooks";
import { useSearchParams } from "next/navigation";

/**
 * MIYO-0113: one list of everything assigned to me, across projects. Rows
 * link to the ticket's own page, so the project pane opens from there.
 */
export default function MyWorkPage() {
  const { data, isLoading, isError, error, refetch } = useMyWork();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";

  const tickets = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    let rows = tickets;
    if (q) {
      const lower = q.toLowerCase();
      rows = rows.filter((t) => t.title?.toLowerCase().includes(lower));
    }
    if (filterStatus) rows = rows.filter((t) => t.status === filterStatus);
    if (filterPriority) rows = rows.filter((t) => t.priority === filterPriority);
    if (filterType) rows = rows.filter((t) => t.type === filterType);
    return rows;
  }, [tickets, q, filterStatus, filterPriority, filterType]);

  const projectCount = new Set(tickets.map((t) => t.projectId)).size;

  if (isLoading) {
    return (
      <PageWrapper title="My work">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="My work"
      subtitle={`${tickets.length} ticket${tickets.length !== 1 ? "s" : ""} assigned to you across ${projectCount} project${projectCount !== 1 ? "s" : ""}`}
      badge={String(tickets.length)}
      filters={<TicketFilterBar showSprintFilter={false} showAssigneeFilter={false} />}
    >
      {isError ? (
        <QueryErrorState title="Couldn't load your work" error={error} onRetry={() => refetch()} />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="Nothing assigned to you"
          description="Tickets assigned to you in any project will appear here."
        />
      ) : (
        <div className="space-y-4">
          <StatsStrip
            items={[
              { label: "Todo", value: tickets.filter((t) => t.status === "TODO").length },
              {
                label: "Active",
                value: tickets.filter((t) => t.status === "IN_PROGRESS").length,
                tone: "info",
              },
              {
                label: "Done",
                value: tickets.filter((t) => t.status === "DONE").length,
                tone: "success",
              },
            ]}
          />
          <div className="overflow-x-auto">
            <Table>
              <caption className="sr-only">Tickets assigned to me across projects</caption>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[100px]" scope="col">ID</TableHead>
                  <TableHead scope="col">Title</TableHead>
                  <TableHead className="w-[160px]" scope="col">Project</TableHead>
                  <TableHead className="w-[120px]" scope="col">Status</TableHead>
                  <TableHead className="w-[100px]" scope="col">Priority</TableHead>
                  <TableHead className="w-[100px]" scope="col">Due date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState
                        compact
                        title="No results for these filters"
                        className="border-0 bg-transparent"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ticket) => {
                    const key = ticketKey(ticket.project?.key, ticket.ticketNumber ?? undefined);
                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <TicketTypeIcon type={ticket.type ?? "TASK"} />
                            {key}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <Link
                            href={`/projects/${ticket.projectId}/tickets/${key}`}
                            className="line-clamp-1 text-sm font-medium hover:underline"
                            title={ticket.title}
                          >
                            {ticket.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <Link href={`/projects/${ticket.projectId}`} className="hover:underline">
                            {ticket.project?.name ?? "—"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status ?? "TODO"} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={ticket.priority} showLabel />
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {ticket.dueDate ? format(new Date(ticket.dueDate), "MMM d") : ""}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
