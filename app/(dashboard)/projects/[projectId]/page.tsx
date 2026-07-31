"use client";

import { use, useState, useMemo, useCallback } from "react";
import { useProject } from "@/lib/hooks/trpc-hooks";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { ListView } from "@/components/projects/list-view";
import { TableView } from "@/components/projects/table-view";
import { CalendarView } from "@/components/projects/calendar-view";
import { GanttView } from "@/components/projects/gantt-view";
import { ViewSwitcher, type ViewType } from "@/components/projects/view-switcher";
import { TicketFilterBar } from "@/components/projects/shared/ticket-filter-bar";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";
import { TicketDetailsDialog } from "@/components/projects/ticket-details/ticket-details-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import type { KanbanTicket } from "@/components/projects/shared/types";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectBoardPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);
  const searchParams = useSearchParams();
  const router = useRouter();

  const view = (searchParams.get("view") as ViewType) ?? "board";
  const [hideCompleted, setHideCompleted] = useState(true);
  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";
  const filterAssigneeId = searchParams.get("assigneeId") ?? "";

  const handleViewChange = useCallback(
    (v: ViewType) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", v);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleTicketSelect = useCallback(
    (id: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("ticket", String(id));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleTicketClose = useCallback(
    (open: boolean) => {
      if (!open) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("ticket");
        router.replace(`?${params.toString()}`, { scroll: false });
      }
    },
    [router, searchParams]
  );

  const allTickets: KanbanTicket[] = useMemo(() => {
    if (!data) return [];
    return (data.tickets || []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status ?? "TODO",
      type: t.type ?? "TASK",
      priority: t.priority ?? undefined,
      points: t.points ?? undefined,
      timeSpent: t.timeSpent ?? undefined,
      ticketNumber: t.ticketNumber,
      order: t.order ?? undefined,
      epicId: t.epicId ?? undefined,
      assigneeId: t.assigneeId ?? undefined,
      sprintId: t.sprintId ?? undefined,
      dueDate: t.dueDate ?? null,
      startDate: t.startDate ?? null,
      createdAt: t.createdAt ?? null,
      updatedAt: t.updatedAt ?? null,
      sequenceId: t.sequenceId ?? null,
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            firstName: t.assignee.firstName ?? undefined,
            lastName: t.assignee.lastName ?? undefined,
            image: t.assignee.image ?? null,
          }
        : null,
      labels: (t.labels || [])
        .filter((l) => !!l.label)
        .map((l) => ({
          label: {
            id: l.label!.id,
            name: l.label!.name,
            color: l.label!.color,
          },
        })),
    }));
  }, [data]);

  const filteredTickets = useMemo(() => {
    let tickets = hideCompleted
      ? allTickets.filter((t) => t.status !== "DONE")
      : allTickets;

    if (q) {
      const lower = q.toLowerCase();
      tickets = tickets.filter((t) => t.title.toLowerCase().includes(lower));
    }
    if (filterStatus) tickets = tickets.filter((t) => t.status === filterStatus);
    if (filterPriority) tickets = tickets.filter((t) => t.priority === filterPriority);
    if (filterType) tickets = tickets.filter((t) => t.type === filterType);
    if (filterAssigneeId) tickets = tickets.filter((t) => t.assigneeId === filterAssigneeId);

    return tickets;
  }, [allTickets, hideCompleted, q, filterStatus, filterPriority, filterType, filterAssigneeId]);

  const members = useMemo(() => {
    if (!data?.members) return [];
    return data.members
      .filter((m) => !!m.user)
      .map((m) => ({
        id: m.user!.id,
        name: m.user!.name ?? null,
        firstName: m.user!.firstName ?? null,
        lastName: m.user!.lastName ?? null,
      }));
  }, [data]);

  const statuses =
    data && "statuses" in data
      ? (data.statuses as { id: number; name: string; color: string | null; order: number }[])
      : undefined;

  const doneCount = allTickets.filter((t) => t.status === "DONE").length;

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title={data.name}
      subtitle={data.description ?? undefined}
      noInternalScroll
      contentClassName="!p-0"
      actions={<CreateTicketDialog projectId={projectId} />}
      filters={
        <>
          <ViewSwitcher activeView={view} onViewChange={handleViewChange} />
          <div className="w-px h-5 bg-border/60 shrink-0 hidden sm:block" />
          <TicketFilterBar
            members={members}
            showSprintFilter={false}
          />
          <div className="w-px h-5 bg-border/60 shrink-0 hidden sm:block" />
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <Switch
              id="hide-done"
              checked={hideCompleted}
              onCheckedChange={setHideCompleted}
              className="scale-90"
            />
            <Label
              htmlFor="hide-done"
              className="text-[11px] font-normal cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
              Done
              {hideCompleted && doneCount > 0 && (
                <span className="text-muted-foreground">({doneCount})</span>
              )}
            </Label>
          </div>
        </>
      }
    >

      {view === "board" && (
        <div className="h-full w-full px-3 pt-2 pb-1">
          <KanbanBoard
            tickets={filteredTickets}
            projectId={projectId}
            projectKey={data.key}
            statuses={statuses}
            onTicketSelect={handleTicketSelect}
          />
        </div>
      )}

      {view === "list" && (
        <div className="h-full overflow-y-auto px-4 py-2">
          <ListView
            tickets={filteredTickets}
            onTicketClick={handleTicketSelect}
            groupBy="status"
          />
        </div>
      )}

      {view === "table" && (
        <div className="h-full overflow-y-auto px-4 py-2">
          <TableView
            tickets={filteredTickets}
            onTicketClick={handleTicketSelect}
          />
        </div>
      )}

      {view === "calendar" && (
        <div className="h-full overflow-y-auto px-4 py-2">
          <CalendarView
            tickets={filteredTickets}
            onTicketClick={handleTicketSelect}
          />
        </div>
      )}

      {view === "gantt" && (
        <div className="h-full overflow-auto px-4 py-2">
          <GanttView
            tickets={filteredTickets}
            onTicketClick={handleTicketSelect}
          />
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
