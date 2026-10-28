"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { HelpdeskCreateTicketForm } from "@/features/hr/helpdesk/helpdesk-create-ticket-form";
import { TicketDetailSheet } from "@/features/hr/helpdesk/ticket-detail-sheet";
import { useHelpdeskAssignees } from "@/lib/api/hooks/hr/helpdesk";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { isSupportStaff } from "@/lib/constants/support-sla";
import type { HelpdeskTicketFormValues } from "@/lib/validations/common-forms";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useHrHelpdeskTickets, useCreateHelpdeskTicket } from "@/lib/api/hooks/hr";
import { AISuggestReplyButton } from "@/features/hr/helpdesk/ai-suggest-reply-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { StatsStrip } from "@/components/shared/stats-strip";
import { ListToolbar } from "@/components/shared/list-toolbar";
import type { Tone } from "@/lib/design/tones";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea as SheetScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Ticket, Clock, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TicketPriority, TicketStatus, HelpdeskTicket } from "@/types/hr";
import { formatIST } from "@/lib/date-utils";
import { TICKET_STATUSES, TICKET_STATUS_LABELS, ticketStatusLabel } from "@/lib/labels";

const STATUS_OPTIONS: { value: TicketStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Status" },
  ...TICKET_STATUSES.map((value) => ({ value, label: TICKET_STATUS_LABELS[value] })),
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

// BUG-13: Helpdesk and Customer Support are separate queues; say which is which.
// Customer Support is for support staff only, so employees get no link to it.
function helpdeskSubtitle(showCustomerSupport: boolean) {
  return (
    <>
      Questions for HR: payroll, leave, policy, equipment and access.
      {showCustomerSupport && (
        <>
          {" "}Reporting a client issue?{" "}
          <Link href="/support" className="font-medium text-brand-text hover:underline">
            Go to Customer Support
          </Link>
        </>
      )}
    </>
  );
}

const CATEGORY_OPTIONS = [
  "IT Support",
  "HR Query",
  "Facilities",
  "Finance",
  "Access Request",
  "Equipment",
  "Other",
];

function statusTone(status: string | null): Tone {
  switch (status) {
    case "DONE":
    case "CLOSED": return "success";
    case "CANCELLED": return "neutral";
    case "IN_PROGRESS": return "info";
    case "IN_REVIEW": return "plum";
    default: return "warning";
  }
}

function priorityTone(priority: string | null): Tone {
  switch (priority) {
    case "URGENT": return "danger";
    case "HIGH": return "warning";
    case "MEDIUM": return "brand";
    default: return "neutral";
  }
}

export default function HelpdeskPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = (searchParams.get("status") as TicketStatus | null) ?? undefined;
  const searchQuery = searchParams.get("q") ?? "";

  const isAdmin = isAdminOrOwner(session?.user?.role);

  const { data: tickets, isLoading, isError, error, refetch } = useHrHelpdeskTickets(undefined, statusFilter);
  const createTicket = useCreateHelpdeskTicket();
  const { data: assignees } = useHelpdeskAssignees(isAdmin);

  const assigneeById = useMemo(() => {
    const map = new Map<string, { name: string | null; email: string; image: string | null }>();
    for (const a of assignees ?? []) map.set(a.userId, a);
    return map;
  }, [assignees]);

  // The Global Create menu links here with ?new=1.
  const [sheetOpen, setSheetOpen] = useState(() => searchParams.get("new") === "1");
  const [canSubmitTicket, setCanSubmitTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // A reply notification links to ?ticket=<id>; open that ticket (FR1-006).
  const linkedTicketId = Number(searchParams.get("ticket")) || null;
  const [openedLinked, setOpenedLinked] = useState(false);
  if (!openedLinked && linkedTicketId && tickets) {
    // Adjusting state during render (once, when the list arrives) rather than
    // in an effect.
    setOpenedLinked(true);
    const linked = tickets.find((t) => t.id === linkedTicketId);
    if (linked) {
      setSelectedTicket(linked);
      setDetailOpen(true);
    }
  }
  const { page, pageSize, setPage, setPageSize } = usePaginationParams();

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Closing (or creating) drops ?new=1 so a reload doesn't reopen the sheet.
  const changeSheetOpen = useCallback(
    (open: boolean) => {
      setSheetOpen(open);
      if (!open && searchParams.get("new")) setFilter("new", null);
    },
    [searchParams, setFilter],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("status");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const stats = useMemo(() => {
    if (!tickets) return { total: 0, open: 0, inProgress: 0, resolved: 0 };
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "TODO").length,
      inProgress: tickets.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW").length,
      resolved: tickets.filter((t) => t.status === "DONE" || t.status === "CLOSED").length,
    };
  }, [tickets]);

  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, page, pageSize]);

  const ticketTotalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));

  const handleCreateTicket = useCallback(
    (values: HelpdeskTicketFormValues) => {
      const isDuplicate = (tickets ?? []).some(
        (t) => t.title.trim().toLowerCase() === values.title.trim().toLowerCase(),
      );
      if (isDuplicate) {
        toast.error("A ticket with this title already exists");
        return;
      }
      createTicket.mutate(
        {
          title: values.title,
          description: values.description || undefined,
          category: values.category || undefined,
          priority: values.priority,
          attachmentUrl: values.attachmentUrl || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Ticket created successfully");
            changeSheetOpen(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [createTicket, tickets, changeSheetOpen],
  );

  if (isLoading) {
    return (
      <PageWrapper title="HR Helpdesk" subtitle={helpdeskSubtitle(isSupportStaff(session?.user?.role))}>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="HR Helpdesk"
      subtitle={helpdeskSubtitle(isSupportStaff(session?.user?.role))}
      badge={`${stats.total} tickets`}
      actions={
        <Sheet open={sheetOpen} onOpenChange={changeSheetOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              New Ticket
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col p-0 gap-0">
            <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
              <SheetTitle className="text-base">New HR Helpdesk ticket</SheetTitle>
              <SheetDescription className="text-xs">Describe your question and HR will get back to you.</SheetDescription>
            </SheetHeader>
            <SheetScrollArea className="flex-1 min-h-0">
              <HelpdeskCreateTicketForm
                formId="helpdesk-create-ticket"
                onSubmit={handleCreateTicket}
                onValidityChange={setCanSubmitTicket}
              />
            </SheetScrollArea>
            <SheetFooter className="shrink-0 flex-row gap-2 border-t bg-background px-4 py-3">
              <Button variant="outline" className="flex-1" onClick={() => changeSheetOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="helpdesk-create-ticket"
                className="flex-1"
                disabled={createTicket.isPending || !canSubmitTicket}
                loading={createTicket.isPending}
              >
                {createTicket.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      }
      filters={
        <ListToolbar
          className="w-full"
          search={{
            value: searchQuery,
            onChange: (v) => setFilter("q", v || null),
            placeholder: "Search tickets...",
          }}
          filters={
            <Select
              value={statusFilter ?? "ALL"}
              onValueChange={(v) => setFilter("status", v)}
            >
              <SelectTrigger className="w-40" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      }
    >
      <div className="space-y-4">
        <StatsStrip
          items={[
            { label: "Total", value: stats.total, icon: Ticket },
            { label: TICKET_STATUS_LABELS.TODO, value: stats.open, icon: AlertCircle, tone: "warning" },
            { label: "In Progress", value: stats.inProgress, icon: Clock, tone: "info" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle2, tone: "success" },
          ]}
        />

        {isError ? (
          <QueryErrorState error={error} onRetry={() => void refetch()} />
        ) : filteredTickets.length === 0 ? (
          searchQuery || statusFilter ? (
            <EmptyState
              title="No results for these filters"
              description={searchQuery ? "No tickets match your search." : undefined}
              action={{ label: "Clear filters", onClick: clearFilters }}
            />
          ) : (
            <EmptyState
              title="No tickets yet"
              action={{ label: "New Ticket", onClick: () => setSheetOpen(true) }}
            />
          )
        ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTickets.map((ticket) => (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer focus-visible:focus-ring"
                          tabIndex={0}
                          onClick={() => { setSelectedTicket(ticket); setDetailOpen(true); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.target === e.currentTarget) {
                              setSelectedTicket(ticket);
                              setDetailOpen(true);
                            }
                          }}
                        >
                          <TableCell>
                            {/* max-width on a table cell doesn't bind in auto layout; on the block it does, so truncate gets its ellipsis. */}
                            <div className="min-w-0 max-w-80">
                              <p className="truncate font-medium text-foreground" title={ticket.title}>{ticket.title}</p>
                              {ticket.description && (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {ticket.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ticket.category ?? ""}
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={priorityTone(ticket.priority)}>
                              {ticket.priority ?? "MEDIUM"}
                            </StatusPill>
                          </TableCell>
                          <TableCell>
                            <StatusPill tone={statusTone(ticket.status)} dot>
                              {ticketStatusLabel(ticket.status)}
                            </StatusPill>
                          </TableCell>
                          <TableCell>
                            {ticket.assigneeId ? (
                              (() => {
                                const a = assigneeById.get(ticket.assigneeId);
                                return (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="size-6">
                                      {a?.image && <AvatarImage src={a.image} alt={a.name ?? ""} />}
                                      <AvatarFallback className="text-3xs">
                                        {(a?.name ?? a?.email ?? "?")
                                          .split(" ")
                                          .map((p) => p[0])
                                          .filter(Boolean)
                                          .slice(0, 2)
                                          .join("")
                                          .toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="max-w-32 truncate">
                                      {a?.name ?? a?.email ?? "Assigned"}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell
                            className="whitespace-nowrap text-muted-foreground tabular-nums"
                            title={ticket.createdAt ? formatIST(ticket.createdAt) : undefined}
                          >
                            {ticket.createdAt
                              ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })
                              : ""}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setDetailOpen(true);
                                }}
                              >
                                <Eye aria-hidden="true" />
                                View
                              </Button>
                              {isAdmin && <AISuggestReplyButton ticketId={ticket.id} compact />}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
            <DataTablePagination
              page={page}
              totalPages={ticketTotalPages}
              total={filteredTickets.length}
              limit={pageSize}
              onPageChange={setPage}
              onLimitChange={(limit) => setPageSize(limit as import("@/lib/pagination-constants").PageSizeOption)}
            />
          </CardContent>
        </Card>
        )}
      </div>

      <TicketDetailSheet
        ticket={
          selectedTicket
            ? (tickets?.find((t) => t.id === selectedTicket.id) ?? selectedTicket)
            : null
        }
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </PageWrapper>
  );
}
