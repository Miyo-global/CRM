"use client";

import { use, useMemo, useCallback, useState, memo } from "react";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useProject, useSprints } from "@/lib/hooks/trpc-hooks";
import { useBulkUpdateTickets } from "@/lib/api/hooks/projects";
import { notFound, usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === "Enter" && e.target === e.currentTarget) onSelect(ticket.id);
    },
    [onSelect, ticket.id]
  );
  const created = ticket.createdAt ? new Date(ticket.createdAt) : null;

  return (
    <TableRow
      className="cursor-pointer outline-none focus-visible:bg-accent/60"
      data-state={isSelected ? "selected" : undefined}
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
    >
      <TableCell onClick={handleCheckboxCellClick}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckedChange}
          aria-label={`Select ticket ${ticket.ticketNumber}`}
        />
      </TableCell>
      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <TicketTypeIcon type={ticket.type} />
          #{ticket.ticketNumber}
        </span>
      </TableCell>
      <TableCell className="min-w-48 max-w-md">
        <span className="line-clamp-1 text-sm font-medium text-foreground">{ticket.title}</span>
      </TableCell>
      <TableCell>
        <StatusBadge status={ticket.status} />
      </TableCell>
      <TableCell>
        <PriorityBadge priority={ticket.priority} showLabel />
      </TableCell>
      <TableCell>
        {ticket.assignee ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <Avatar className="size-6">
              <AvatarImage src={resolveImageUrl(ticket.assignee.image)} />
              <AvatarFallback className="text-3xs">
                {ticket.assignee.firstName?.[0]}
                {ticket.assignee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs">
              {ticket.assignee.firstName}
            </span>
          </div>
        ) : (
          null
        )}
      </TableCell>
      <TableCell
        className="whitespace-nowrap text-xs tabular-nums text-muted-foreground"
        title={created ? format(created, "PPP") : undefined}
      >
        {created ? format(created, "MMM d") : ""}
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
  const { data, isLoading, isError, error, refetch } = useProject(projectId);
  const { data: sprints } = useSprints(projectId);
  const bulkUpdate = useBulkUpdateTickets(projectId);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const ticketParam = searchParams.get("ticket");
  const selectedTicketId = ticketParam ? parseInt(ticketParam) : null;

  const q = searchParams.get("q") ?? "";
  const filterStatus = searchParams.get("status") ?? "";
  const filterPriority = searchParams.get("priority") ?? "";
  const filterType = searchParams.get("type") ?? "";
  const filterAssigneeId = searchParams.get("assigneeId") ?? "";

  const tickets = useMemo(() => data?.tickets || [], [data?.tickets]);
  const hasFilters = !!(q || filterStatus || filterPriority || filterType || filterAssigneeId);

  // Same params TicketFilterBar's "Clear" removes.
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    ["q", "status", "priority", "type", "sprintId", "assigneeId", "page"].forEach((k) => params.delete(k));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

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
      <PageWrapper title="Backlog">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Backlog">
        <QueryErrorState title="Couldn't load the backlog" error={error} onRetry={() => void refetch()} />
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
      contentClassName={selectedIds.size > 0 ? "pb-24" : undefined}
    >
      {tickets.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          description="Create your first ticket to start building the backlog."
        />
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          title="No results for these filters"
          description="Try a different search or clear the filters."
          action={hasFilters ? { label: "Clear filters", onClick: clearFilters } : undefined}
        />
      ) : (
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
              <TableHead className="w-24" scope="col">ID</TableHead>
              <TableHead scope="col">Title</TableHead>
              <TableHead className="w-32" scope="col">Status</TableHead>
              <TableHead className="w-28" scope="col">Priority</TableHead>
              <TableHead className="w-36" scope="col">Assignee</TableHead>
              <TableHead className="w-28" scope="col">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                isSelected={selectedIds.has(ticket.id)}
                onSelect={handleTicketSelect}
                onToggleSelect={toggleSelect}
              />
            ))}
          </TableBody>
        </Table>
      )}

      {selectedIds.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-sticky flex justify-center px-4">
          <div
            role="region"
            aria-label="Bulk actions"
            className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-3xl bg-secondary py-1.5 pr-1.5 pl-4 text-secondary-foreground shadow-lg sm:min-h-11 sm:rounded-full"
          >
            <span className="shrink-0 text-sm font-medium tabular-nums">{selectedIds.size} selected</span>
            <Select disabled={bulkUpdate.isPending} onValueChange={(v) => handleBulkUpdate({ status: v })}>
              <SelectTrigger className="h-8 w-36 bg-background text-xs text-foreground"><SelectValue placeholder="Set Status" /></SelectTrigger>
              <SelectContent>
                {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select disabled={bulkUpdate.isPending} onValueChange={(v) => handleBulkUpdate({ assigneeId: v })}>
              <SelectTrigger className="h-8 w-36 bg-background text-xs text-foreground"><SelectValue placeholder="Assign to" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.firstName ?? m.name ?? m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select disabled={bulkUpdate.isPending} onValueChange={(v) => handleBulkUpdate({ sprintId: v === "backlog" ? null : Number(v) })}>
              <SelectTrigger className="h-8 w-40 bg-background text-xs text-foreground"><SelectValue placeholder="Move to Sprint" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog" className="text-xs">Backlog (remove sprint)</SelectItem>
                {(sprints ?? []).filter((s) => s.status !== "COMPLETED").map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
              onClick={() => setSelectedIds(new Set())}
              aria-label="Clear selection"
            >
              <X className="size-4" />
            </Button>
          </div>
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
