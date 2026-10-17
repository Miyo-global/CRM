"use client";

import { use, useState, useMemo, useCallback } from "react";
import { useColumnCounts, useProject } from "@/lib/hooks/trpc-hooks";
import { SwimlaneBoard, type SwimlaneKey } from "@/features/projects/board/swimlane-board";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import type { KanbanTicket } from "@/components/projects/shared/types";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectBoardPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading, isError, error, refetch } = useProject(projectId);
  const { data: columnCounts } = useColumnCounts(projectId);
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
  const swimlane = (searchParams.get("lanes") as SwimlaneKey | null) ?? "none";

  const handleSwimlaneChange = useCallback(
    (value: SwimlaneKey) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "none") params.delete("lanes");
      else params.set("lanes", value);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleViewChange = useCallback(
    (v: ViewType) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", v);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // MIYO-0110: opening a card navigates to the ticket's own URL, which is
  // intercepted into the side pane. Reloading that URL gives the full page,
  // and Back closes the pane. Older `?ticket=<id>` links still open the
  // dialog below.
  const handleTicketSelect = useCallback(
    (id: number) => {
      const ticket = data?.tickets?.find((t) => t.id === id);
      if (data?.key && ticket?.ticketNumber) {
        router.push(`/projects/${projectId}/tickets/${data.key}-${ticket.ticketNumber}`, {
          scroll: false,
        });
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("ticket", String(id));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [data, projectId, router, searchParams]
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
      rank: t.rank ?? null,
      version: t.version,
      epicId: t.epicId ?? undefined,
      assigneeId: t.assigneeId ?? undefined,
      sprintId: t.sprintId ?? undefined,
      dueDate: t.dueDate ?? null,
      startDate: t.startDate ?? null,
      createdAt: t.createdAt ?? null,
      updatedAt: t.updatedAt ?? null,
      sequenceId: t.sequenceId ?? null,
      checklistTotal: t.checklistItems?.length ?? 0,
      checklistDone: t.checklistItems?.filter((c) => c.isDone).length ?? 0,
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

  const statuses = data?.statuses;
  const wipLimits = useMemo(
    () =>
      Object.fromEntries(
        (statuses ?? []).filter((s) => s.wipLimit != null).map((s) => [s.name, s.wipLimit as number]),
      ),
    [statuses]
  );
  const readOnly = data?.viewerRole === "VIEWER";

  const doneCount = allTickets.filter((t) => t.status === "DONE").length;

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." noInternalScroll>
        <KanbanBoardSkeleton />
      </PageWrapper>
    );
  }

  if (isError && !data) {
    return (
      <PageWrapper title="Project">
        <QueryErrorState error={error} onRetry={() => refetch()} />
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
      actions={readOnly ? undefined : <CreateTicketDialog projectId={projectId} />}
      filters={
        <>
          <ViewSwitcher activeView={view} onViewChange={handleViewChange} />
          {view === "board" && (
            <Select value={swimlane} onValueChange={(v) => handleSwimlaneChange(v as SwimlaneKey)}>
              <SelectTrigger className="h-10 w-40" aria-label="Swimlanes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No swimlanes</SelectItem>
                <SelectItem value="assignee">Lanes: assignee</SelectItem>
                <SelectItem value="priority">Lanes: priority</SelectItem>
                <SelectItem value="type">Lanes: type</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-border sm:block" />
          <TicketFilterBar
            members={members}
            showSprintFilter={false}
            statuses={statuses?.map((s) => s.name)}
          />
          <div aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-border sm:block" />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Switch
              id="hide-done"
              checked={hideCompleted}
              onCheckedChange={setHideCompleted}
            />
            <Label
              htmlFor="hide-done"
              className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs font-normal"
            >
              <CheckCircle2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
              Done
              {hideCompleted && doneCount > 0 && (
                <span className="tabular-nums text-muted-foreground">({doneCount})</span>
              )}
            </Label>
          </div>
        </>
      }
    >

      {view === "board" && (
        <div className="flex h-full w-full flex-col bg-surface-sunken sm:px-2 xl:px-4">
          {swimlane === "none" ? (
            <KanbanBoard
              tickets={filteredTickets}
              projectId={projectId}
              projectKey={data.key}
              statuses={statuses}
              onTicketSelect={handleTicketSelect}
              wipLimits={wipLimits}
              columnCounts={hideCompleted || q || filterStatus || filterPriority || filterType || filterAssigneeId ? undefined : columnCounts}
              readOnly={readOnly}
            />
          ) : (
            <SwimlaneBoard
              lane={swimlane}
              tickets={filteredTickets}
              projectId={projectId}
              projectKey={data.key}
              statuses={statuses}
              onTicketSelect={handleTicketSelect}
              wipLimits={wipLimits}
              readOnly={readOnly}
            />
          )}
        </div>
      )}

      {view === "list" && (
        <div className="h-full overflow-y-auto px-4 py-4 sm:px-6 xl:px-8">
          <ListView
            tickets={filteredTickets}
            onTicketClick={handleTicketSelect}
            groupBy="status"
          />
        </div>
      )}

      {view === "table" && (
        <div className="h-full overflow-y-auto px-4 py-4 sm:px-6 xl:px-8">
          <TableView
            tickets={filteredTickets}
            onTicketClick={handleTicketSelect}
          />
        </div>
      )}

      {view === "calendar" && (
        <div className="h-full overflow-y-auto px-4 py-4 sm:px-6 xl:px-8">
          <CalendarView
            tickets={filteredTickets}
            onTicketClick={handleTicketSelect}
          />
        </div>
      )}

      {view === "gantt" && (
        <div className="h-full overflow-auto px-4 py-4 sm:px-6 xl:px-8">
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
