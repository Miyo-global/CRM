"use client";

import { use, useMemo, useCallback } from "react";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "next-auth/react";
import { useProject } from "@/lib/hooks/trpc-hooks";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { TicketFilterBar } from "@/components/projects/shared/ticket-filter-bar";
import { TicketTypeIcon } from "@/components/projects/shared/ticket-type-icon";
import { PriorityBadge } from "@/components/projects/shared/priority-badge";
import { StatusBadge } from "@/components/projects/shared/status-badge";
import { TicketDetailsDialog } from "@/components/projects/ticket-details/ticket-details-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function MyTicketsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const userId = session?.user?.id;

  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";

  const myTickets = useMemo(() => {
    if (!data?.tickets || !userId) return [];
    return data.tickets.filter((t) => {

      if (t.assigneeId === userId) return true;

      if (t.assignees?.some((a) => a.userId === userId)) return true;

      if (t.reporterId === userId) return true;
      return false;
    });
  }, [data?.tickets, userId]);

  const filteredTickets = useMemo(() => {
    let result = myTickets;
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(lower) ||
          t.description?.toLowerCase().includes(lower)
      );
    }
    if (filterStatus) result = result.filter((t) => t.status === filterStatus);
    if (filterPriority) result = result.filter((t) => t.priority === filterPriority);
    if (filterType) result = result.filter((t) => t.type === filterType);
    return result;
  }, [myTickets, q, filterStatus, filterPriority, filterType]);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("ticket", String(id));
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleTicketClose = useCallback(
    (open: boolean) => {
      if (!open) {
        const p = new URLSearchParams(searchParams.toString());
        p.delete("ticket");
        router.replace(`?${p.toString()}`, { scroll: false });
      }
    },
    [router, searchParams]
  );

  const statuses =
    data && "statuses" in data
      ? (data.statuses as { id: number; name: string; color: string | null; order: number }[])
      : undefined;

  const todoCount = myTickets.filter((t) => t.status === "TODO").length;
  const inProgressCount = myTickets.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = myTickets.filter((t) => t.status === "DONE").length;

  if (isLoading) {
    return (
      <PageWrapper title="My Tickets" subtitle="Tickets assigned to you">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title="My Tickets"
      subtitle={`${myTickets.length} ticket${myTickets.length !== 1 ? "s" : ""} assigned to you`}
      badge={
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{todoCount} todo</span>
          <span className="text-blue-500">{inProgressCount} active</span>
          <span className="text-green-500">{doneCount} done</span>
        </div>
      }
      filters={
        <TicketFilterBar
          showSprintFilter={false}
          showAssigneeFilter={false}
        />
      }
    >
      {myTickets.length === 0 ? (
        <EmptyState
          illustration={<EmptyTasksIllustration className="h-32 w-32 opacity-95" />}
          title="No tickets assigned to you"
          description="Tickets you create or get assigned to will appear here."
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <caption className="sr-only">My tickets</caption>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-[80px]" scope="col">ID</TableHead>
                <TableHead scope="col">Title</TableHead>
                <TableHead className="w-[120px]" scope="col">Status</TableHead>
                <TableHead className="w-[100px]" scope="col">Priority</TableHead>
                <TableHead className="w-[80px]" scope="col">Points</TableHead>
                <TableHead className="w-[100px]" scope="col">Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      illustration={<EmptyTasksIllustration className="h-32 w-32 opacity-95" />}
                      title="No matching tickets"
                      description="No tickets match your current filters."
                      className="border-0 bg-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleTicketSelect(ticket.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <TicketTypeIcon type={ticket.type} />
                        #{ticket.ticketNumber}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <span className="text-sm font-medium line-clamp-1">{ticket.title}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} showLabel />
                    </TableCell>
                    <TableCell>
                      {ticket.points != null && ticket.points > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {ticket.points}
                        </Badge>
                      ) : (
                        null
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ticket.dueDate
                        ? format(new Date(ticket.dueDate), "MMM d")
                        : ""}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <TicketDetailsDialog
        ticketId={selectedTicketId}
        open={!!selectedTicketId}
        onOpenChange={handleTicketClose}
        projectId={projectId}
        statuses={statuses?.map((s) => ({ id: s.id, name: s.name }))}
      />
    </PageWrapper>
  );
}
