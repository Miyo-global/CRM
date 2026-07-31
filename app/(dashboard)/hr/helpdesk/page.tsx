"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useCallback, useMemo } from "react";
import { HelpdeskCreateTicketForm } from "@/features/hr/helpdesk/helpdesk-create-ticket-form";
import { TicketDetailSheet } from "@/features/hr/helpdesk/ticket-detail-sheet";
import { useHelpdeskAssignees } from "@/lib/api/hooks/hr/helpdesk";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isAdminOrOwner } from "@/lib/constants/roles";
import type { HelpdeskTicketFormValues } from "@/lib/validations/common-forms";
import { usePaginationParams } from "@/hooks/use-pagination-params";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { useSearchParams, useRouter } from "next/navigation";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { useSession } from "next-auth/react";
import { useHrHelpdeskTickets, useCreateHelpdeskTicket } from "@/lib/api/hooks/hr";
import { AISuggestReplyButton } from "@/features/hr/helpdesk/ai-suggest-reply-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Plus, Search, Ticket, Clock, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TicketPriority, TicketStatus, HelpdeskTicket } from "@/types/hr";

const STATUS_OPTIONS: { value: TicketStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Status" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const CATEGORY_OPTIONS = [
  "IT Support",
  "HR Query",
  "Facilities",
  "Finance",
  "Access Request",
  "Equipment",
  "Other",
];

function statusBadgeVariant(status: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "DONE": return "default";
    case "IN_PROGRESS": return "secondary";
    case "IN_REVIEW": return "outline";
    default: return "destructive";
  }
}

function priorityBadgeVariant(priority: string | null): "default" | "secondary" | "outline" | "destructive" {
  switch (priority) {
    case "URGENT": return "destructive";
    case "HIGH": return "default";
    case "MEDIUM": return "secondary";
    default: return "outline";
  }
}

export default function HelpdeskPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = (searchParams.get("status") as TicketStatus | null) ?? undefined;
  const searchQuery = searchParams.get("q") ?? "";

  const isAdmin = isAdminOrOwner(session?.user?.role);

  const { data: tickets, isLoading } = useHrHelpdeskTickets(undefined, statusFilter);
  const createTicket = useCreateHelpdeskTicket();
  const { data: assignees } = useHelpdeskAssignees(isAdmin);

  const assigneeById = useMemo(() => {
    const map = new Map<string, { name: string | null; email: string; image: string | null }>();
    for (const a of assignees ?? []) map.set(a.userId, a);
    return map;
  }, [assignees]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [canSubmitTicket, setCanSubmitTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
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
      resolved: tickets.filter((t) => t.status === "DONE").length,
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
            setSheetOpen(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [createTicket, tickets],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Helpdesk" subtitle="Submit and track your support tickets">
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Helpdesk"
      subtitle="Submit and track your support tickets"
      badge={`${stats.total} tickets`}
      actions={
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </SheetTrigger>
          <SheetContent className="flex flex-col p-0 gap-0">
            <SheetHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
              <SheetTitle className="text-base">Create Support Ticket</SheetTitle>
              <SheetDescription className="text-xs">Describe your issue and we&apos;ll get back to you.</SheetDescription>
            </SheetHeader>
            <SheetScrollArea className="flex-1 min-h-0">
              <HelpdeskCreateTicketForm
                formId="helpdesk-create-ticket"
                onSubmit={handleCreateTicket}
                onValidityChange={setCanSubmitTicket}
              />
            </SheetScrollArea>
            <SheetFooter className="shrink-0 px-4 py-3 border-t flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="helpdesk-create-ticket"
                className="flex-1"
                disabled={createTicket.isPending || !canSubmitTicket}
              >
                {createTicket.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      }
      filters={
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setFilter("q", e.target.value || null)}
              className="pl-9 w-[200px]"
            />
          </div>
          <Select
            value={statusFilter ?? "ALL"}
            onValueChange={(v) => setFilter("status", v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-6">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Ticket, color: "" },
            { label: "Open", value: stats.open, icon: AlertCircle, color: "text-orange-500" },
            { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-blue-500" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-green-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-xs">{label}</span>
                </div>
                <p className="text-xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <ScrollArea className="w-full" type="auto">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <EmptyTicketIllustration className="h-36 w-36 opacity-95" />
                            <p>{searchQuery ? "No tickets match your search." : "No tickets yet. Create your first one!"}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTickets.map((ticket) => (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer"
                          onClick={() => { setSelectedTicket(ticket); setDetailOpen(true); }}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{ticket.title}</p>
                              {ticket.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {ticket.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{ticket.category ?? ""}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={priorityBadgeVariant(ticket.priority)}>
                              {ticket.priority ?? "MEDIUM"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(ticket.status)}>
                              {(ticket.status ?? "TODO").replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ticket.assigneeId ? (
                              (() => {
                                const a = assigneeById.get(ticket.assigneeId);
                                return (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      {a?.image && <AvatarImage src={a.image} alt={a.name ?? ""} />}
                                      <AvatarFallback className="text-[10px]">
                                        {(a?.name ?? a?.email ?? "?")
                                          .split(" ")
                                          .map((p) => p[0])
                                          .filter(Boolean)
                                          .slice(0, 2)
                                          .join("")
                                          .toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm truncate max-w-[120px]">
                                      {a?.name ?? a?.email ?? "Assigned"}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-sm text-muted-foreground">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ticket.createdAt
                              ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })
                              : ""}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setDetailOpen(true);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                View
                              </Button>
                              {isAdmin && <AISuggestReplyButton ticketId={ticket.id} compact />}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
            {filteredTickets.length > 0 && (
              <DataTablePagination
                page={page}
                totalPages={ticketTotalPages}
                total={filteredTickets.length}
                limit={pageSize}
                onPageChange={setPage}
                onLimitChange={(limit) => setPageSize(limit as import("@/lib/pagination-constants").PageSizeOption)}
              />
            )}
          </CardContent>
        </Card>
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
