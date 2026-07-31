"use client";

import { use, useMemo, useCallback, useState, memo } from "react";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { useProject, useSprints } from "@/lib/hooks/trpc-hooks";
import { useBulkUpdateTickets } from "@/lib/api/hooks/projects";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { CreateTicketDialog } from "@/components/projects/create-ticket-dialog";
import { TicketFilterBar } from "@/components/projects/shared/ticket-filter-bar";
import { TicketTypeIcon } from "@/components/projects/shared/ticket-type-icon";
import { PriorityBadge } from "@/components/projects/shared/priority-badge";
import { StatusBadge } from "@/components/projects/shared/status-badge";
import { TicketDetailsDialog } from "@/components/projects/ticket-details/ticket-details-dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { X } from "lucide-react";
import { getErrorMessage } from "@/lib/get-error-message";

interface TicketRowProps {
  ticket: {
    id: number;
    ticketNumber: string | number;
    title: string | null;
    description?: string | null;
    status: string;
    priority: string | null;
    type: string;
    assigneeId?: string | null;
    createdAt?: string | Date | null;
    assignee?: {
      image?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  };
  isSelected: boolean;
  onSelect: (id: number) => void;
  onToggleSelect: (id: number) => void;
}

const TicketRow = memo(function TicketRow({
  ticket,
  isSelected,
  onSelect,
  onToggleSelect,
}: TicketRowProps) {
  const handleRowClick = useCallback(() => onSelect(ticket.id), [onSelect, ticket.id]);
  const handleCheckboxCellClick = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onToggleSelect(ticket.id); },
    [onToggleSelect, ticket.id]
  );
  const handleCheckedChange = useCallback(
    () => onToggleSelect(ticket.id),
    [onToggleSelect, ticket.id]
  );

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-primary/5" : ""}`}
      onClick={handleRowClick}
    >
      <TableCell onClick={handleCheckboxCellClick}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckedChange}
          aria-label={`Select ticket ${ticket.ticketNumber}`}
        />
      </TableCell>
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
        {ticket.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-6 w-6">
              <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
              <AvatarFallback className="text-[8px]">
                {ticket.assignee.firstName?.[0]}
                {ticket.assignee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs truncate">
              {ticket.assignee.firstName}
            </span>
          </div>
        ) : (
          null
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {ticket.createdAt
          ? format(new Date(ticket.createdAt), "MMM d")
          : ""}
      </TableCell>
    </TableRow>
  );
});

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function BacklogPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const { data, isLoading } = useProject(projectId);
  const { data: sprints } = useSprints(projectId);
  const bulkUpdate = useBulkUpdateTickets(projectId);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";
  const filterAssigneeId = searchParams.get("assigneeId") ?? "";

  const tickets = useMemo(() => data?.tickets || [], [data?.tickets]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
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
    if (filterAssigneeId) result = result.filter((t) => t.assigneeId === filterAssigneeId);
    return result;
  }, [tickets, q, filterStatus, filterPriority, filterType, filterAssigneeId]);

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

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === filteredTickets.length
        ? new Set()
        : new Set(filteredTickets.map((t) => t.id))
    );
  }, [filteredTickets]);

  const handleBulkUpdate = useCallback(
    (update: { assigneeId?: string; status?: string; sprintId?: number | null }) => {
      bulkUpdate.mutate(
        { ticketIds: Array.from(selectedIds), ...update },
        {
          onSuccess: (data) => {
            toast.success(`${data.updated} ticket${data.updated !== 1 ? "s" : ""} updated`);
            setSelectedIds(new Set());
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    },
    [selectedIds, bulkUpdate]
  );

  const statuses =
    data && "statuses" in data
      ? (data.statuses as { id: number; name: string; color: string | null; order: number }[])
      : undefined;

  if (isLoading) {
    return (
      <PageWrapper title="Backlog" subtitle="All tickets">
        <div className="space-y-3 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (!data) return notFound();

  return (
    <PageWrapper
      title="Backlog"
      subtitle={`${tickets.length} ticket${tickets.length !== 1 ? "s" : ""}`}
      actions={<CreateTicketDialog projectId={projectId} />}
      filters={<TicketFilterBar members={members} showSprintFilter={false} />}
    >
      {selectedIds.size > 0 && (
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-primary shrink-0">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <Select onValueChange={(v) => handleBulkUpdate({ status: v })}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Set Status" /></SelectTrigger>
              <SelectContent>
                {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => handleBulkUpdate({ assigneeId: v })}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Assign to" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.firstName ?? m.name ?? m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => handleBulkUpdate({ sprintId: v === "backlog" ? null : Number(v) })}>
              <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Move to Sprint" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog" className="text-xs">Backlog (remove sprint)</SelectItem>
                {(sprints ?? []).filter((s) => s.status !== "COMPLETED").map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg mx-4 mb-4">
        <Table>
          <caption className="sr-only">Backlog tickets</caption>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-10" scope="col">
                <Checkbox
                  checked={filteredTickets.length > 0 && selectedIds.size === filteredTickets.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all tickets"
                />
              </TableHead>
              <TableHead className="w-[80px]" scope="col">ID</TableHead>
              <TableHead scope="col">Title</TableHead>
              <TableHead className="w-[120px]" scope="col">Status</TableHead>
              <TableHead className="w-[100px]" scope="col">Priority</TableHead>
              <TableHead className="w-[140px]" scope="col">Assignee</TableHead>
              <TableHead className="w-[110px]" scope="col">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    illustration={<EmptyTasksIllustration className="h-32 w-32 opacity-95" />}
                    title="No tickets yet"
                    description="Create your first ticket to start building the backlog."
                    className="border-0 bg-transparent"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredTickets.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  isSelected={selectedIds.has(ticket.id)}
                  onSelect={handleTicketSelect}
                  onToggleSelect={toggleSelect}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
