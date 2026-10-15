"use client";

import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  useSupportTickets,
  useSupportTicket,
  useCreateSupportTicket,
  useUpdateSupportTicket,
  useAddSupportMessage,
  useSupportStats,
} from "@/lib/api/hooks/support";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Clock,
  ChevronLeft,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Send,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { PropertyList } from "@/components/shared/property-list";
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
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn, resolveImageUrl } from "@/lib/utils";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { getInitials } from "@/lib/format-utils";
import type { SupportTicketStatus, SupportTicketPriority, SupportTicket } from "@/types/support";
import { formatIST } from "@/lib/date-utils";

const PRIORITY_TONES: Record<string, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const STATUS_TONES: Record<string, Tone> = {
  OPEN: "info",
  IN_PROGRESS: "brand",
  WAITING: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  OPEN: AlertTriangle,
  IN_PROGRESS: Clock,
  WAITING: Pause,
  RESOLVED: CheckCircle2,
  CLOSED: CheckCircle2,
};

function toTitleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function toSentenceCase(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function SupportInboxPage() {
  return (
    <DashboardGate allowedRoles={["CEO", "HR", "CUSTOMER_SUPPORT"]}>
      <InboxContent />
    </DashboardGate>
  );
}

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const statusFilter = searchParams.get("status") || "all";
  const priorityFilter = searchParams.get("priority") || "all";

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [searchParams, router, pathname]);

  const { data: ticketsData, isLoading, isError, error, refetch } = useSupportTickets({
    ...(statusFilter !== "all" ? { status: statusFilter as SupportTicketStatus } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter as SupportTicketPriority } : {}),
  });
  const { data: stats, isLoading: statsLoading } = useSupportStats();

  const tickets = ticketsData?.items ?? [];

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleStatusFilter = useCallback((v: string) => updateFilter("status", v), [updateFilter]);
  const handlePriorityFilter = useCallback((v: string) => updateFilter("priority", v), [updateFilter]);
  const handleBackFromTicket = useCallback(() => setSelectedTicketId(null), []);

  const hasActiveFilters = statusFilter !== "all" || priorityFilter !== "all";

  return (
    <>
      <PageWrapper
        title="Support inbox"
        subtitle={
          statsLoading
            ? "Loading..."
            : `${(stats?.open ?? 0) + (stats?.in_progress ?? 0)} active tickets${(stats?.sla_breached ?? 0) > 0 ? ` · ${stats?.sla_breached} SLA breached` : ""}`
        }
        actions={
          <Button onClick={handleOpenCreate} size="sm">
            <Plus aria-hidden /> New Ticket
          </Button>
        }
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={handlePriorityFilter}>
              <SelectTrigger className="h-8 w-32 text-xs" aria-label="Filter by priority"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        noInternalScroll
        contentClassName="flex h-[calc(100dvh-14rem)] min-h-96 overflow-hidden px-0 pt-0 pb-0 sm:px-0 xl:px-0"
      >
        <div className={cn("flex w-full flex-col overflow-hidden border-border lg:w-90 lg:shrink-0 lg:border-r", selectedTicketId && "hidden lg:flex")}>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="space-y-px" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2 px-4 py-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="p-4">
                <QueryErrorState error={error} onRetry={() => void refetch()} className="min-h-0 py-8" />
              </div>
            ) : tickets.length === 0 ? (
              hasActiveFilters ? (
                <EmptyState
                  compact
                  icon={Inbox}
                  title="No results for these filters"
                  className="m-4"
                />
              ) : (
                <EmptyState
                  compact
                  title="No tickets found"
                  description="New tickets will appear here."
                  action={{ label: "New Ticket", onClick: handleOpenCreate }}
                  className="m-4"
                />
              )
            ) : (
              <div className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <TicketListItem
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={selectedTicketId === ticket.id}
                    onSelect={setSelectedTicketId}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className={cn("flex min-w-0 flex-1 flex-col", !selectedTicketId && "hidden lg:flex")}>
          {selectedTicketId ? (
            <TicketDetail ticketId={selectedTicketId} onBack={handleBackFromTicket} />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="Select a ticket"
                description="Choose a ticket from the list to view its details"
                className="border-0 bg-transparent"
              />
            </div>
          )}
        </div>
      </PageWrapper>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

interface TicketListItemProps {
  ticket: SupportTicket;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

function TicketListItem({ ticket, isSelected, onSelect }: TicketListItemProps) {
  const handleClick = useCallback(() => onSelect(ticket.id), [ticket.id, onSelect]);
  const StatusIcon = STATUS_ICONS[ticket.status] ?? Clock;
  const isBreached = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && !["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "relative w-full px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:focus-ring",
        isSelected && "bg-brand-soft hover:bg-brand-soft"
      )}
    >
      {isSelected && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={toTitleCase(ticket.title)}>{toTitleCase(ticket.title)}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <span className="font-mono">#{ticket.id}</span> {ticket.client?.name ? `- ${ticket.client.name}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill tone={PRIORITY_TONES[ticket.priority] ?? "neutral"}>
            {ticket.priority}
          </StatusPill>
          {isBreached && (
            <StatusPill tone="danger" dot>SLA</StatusPill>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <StatusIcon className="size-3 text-muted-foreground" aria-hidden />
        <span className="text-xs text-muted-foreground">{ticket.status.replace("_", " ")}</span>
        <span
          className="ml-auto text-xs text-muted-foreground tabular-nums"
          title={ticket.createdAt ? formatIST(ticket.createdAt) : undefined}
        >
          {ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }) : ""}
        </span>
      </div>
    </button>
  );
}

function TicketDetail({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { data: ticket, isLoading } = useSupportTicket(ticketId);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const addMessage = useAddSupportMessage();
  const updateTicket = useUpdateSupportTicket();

  const aiReply = useMutation({
    mutationFn: (id: number) =>
      apiClient.post<{ suggestedReply: string }>("/ai/support-reply", { ticketId: id }),
    onSuccess: (data) => {
      if (data.suggestedReply) setReplyText(data.suggestedReply);
    },
    onError: () => toast.error("AI reply generation failed. Please try again."),
  });

  const handleAiReply = useCallback(() => {
    aiReply.mutate(ticketId);
  }, [aiReply, ticketId]);

  const handleReply = useCallback(() => {
    if (!replyText.trim()) return;
    addMessage.mutate(
      { ticketId, body: replyText, isInternal },
      {
        onSuccess: () => {
          setReplyText("");
          toast.success("Reply sent");
        },
        onError: () => toast.error("Failed to send reply. Please try again."),
      }
    );
  }, [replyText, ticketId, isInternal, addMessage]);

  const handleStatusChange = useCallback((status: SupportTicketStatus) => {
    if (!ticket) return;
    updateTicket.mutate(
      { id: ticket.id, status },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: () => toast.error("Failed to update status. Please try again."),
      }
    );
  }, [ticket, updateTicket]);

  const handleStatusValueChange = useCallback((v: string) => handleStatusChange(v as SupportTicketStatus), [handleStatusChange]);
  const handleReplyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value), []);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  }, [handleReply]);

  if (isLoading || !ticket) {
    return (
      <div className="flex-1 space-y-4 p-4" aria-busy="true">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-16 w-2/3" />
      </div>
    );
  }

  const isBreached = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && !["RESOLVED", "CLOSED"].includes(ticket.status);
  const messages = [...(ticket.messages ?? [])].reverse();
  const fmtDate = (d: Date | string | null) => (d ? formatIST(d) : null);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Button variant="ghost" size="icon-sm" onClick={onBack} className="lg:hidden" aria-label="Back">
                <ChevronLeft aria-hidden />
              </Button>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{toTitleCase(ticket.title)}</h2>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">#{ticket.id}</span> {ticket.client?.name ? `- ${ticket.client.name}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={PRIORITY_TONES[ticket.priority] ?? "neutral"}>{ticket.priority}</StatusPill>
              {isBreached && <StatusPill tone="danger" dot>SLA Breached</StatusPill>}
              <Select value={ticket.status} onValueChange={handleStatusValueChange}>
                <SelectTrigger className="h-8 w-32 text-xs" aria-label="Ticket status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="WAITING">Waiting</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 py-4">
            {ticket.description && (
              <div className="mb-4 rounded-lg bg-surface-sunken p-3 text-sm">{toSentenceCase(ticket.description)}</div>
            )}
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-2.5">
                  <Avatar className="mt-0.5 size-7 shrink-0">
                    <AvatarImage src={resolveImageUrl(msg.author?.image)} />
                    <AvatarFallback className="text-3xs">{getInitials(msg.author?.name)}</AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "min-w-0 flex-1 rounded-lg border px-3 py-2",
                    msg.isInternal
                      ? "border-warning-soft bg-warning-soft"
                      : "border-border bg-card"
                  )}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold">{msg.author?.name}</span>
                      {msg.isInternal && (
                        <StatusPill tone="warning">
                          <Lock className="size-2.5" aria-hidden /> Internal
                        </StatusPill>
                      )}
                      <span
                        className="text-xs text-muted-foreground tabular-nums"
                        title={fmtDate(msg.createdAt) ?? undefined}
                      >
                        {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">{msg.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t border-border bg-card px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Switch id="reply-internal" checked={isInternal} onCheckedChange={setIsInternal} />
              <Label htmlFor="reply-internal" className="cursor-pointer text-xs text-muted-foreground">
                {isInternal ? "Internal note (not visible to client)" : "Public reply"}
              </Label>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleAiReply}
              disabled={aiReply.isPending}
              loading={aiReply.isPending}
              className="text-muted-foreground"
              aria-label="Generate AI reply suggestion"
            >
              {!aiReply.isPending && <Sparkles aria-hidden />}
              AI Reply
            </Button>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={replyText}
              onChange={handleReplyChange}
              placeholder={isInternal ? "Add internal note..." : "Type your reply..."}
              className="max-h-30 min-h-15 resize-none text-sm"
              onKeyDown={handleKeyDown}
              aria-label={isInternal ? "Internal note" : "Reply"}
            />
            <Button
              onClick={handleReply}
              disabled={!replyText.trim() || addMessage.isPending}
              loading={addMessage.isPending}
              size="icon"
              className="h-15 w-10 shrink-0"
              aria-label="Send reply"
            >
              {!addMessage.isPending && <Send aria-hidden />}
            </Button>
          </div>
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border p-4 xl:block" aria-label="Ticket properties">
        <h3 className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Properties</h3>
        <PropertyList
          className="grid-cols-[96px_1fr]"
          items={[
            { label: "Status", value: <StatusPill tone={STATUS_TONES[ticket.status] ?? "neutral"} dot>{ticket.status.replace("_", " ")}</StatusPill> },
            { label: "Priority", value: <StatusPill tone={PRIORITY_TONES[ticket.priority] ?? "neutral"}>{ticket.priority}</StatusPill> },
            { label: "Client", value: ticket.client?.name ?? null },
            { label: "Assignee", value: ticket.assignee?.name ?? null },
            { label: "Created by", value: ticket.creator?.name ?? null },
            { label: "Created", value: fmtDate(ticket.createdAt) ? <span className="tabular-nums">{fmtDate(ticket.createdAt)}</span> : null },
            {
              label: "SLA due",
              value: ticket.slaDeadline ? (
                <span className={cn("tabular-nums", isBreached && "font-medium text-danger-strong")}>
                  {fmtDate(ticket.slaDeadline)}
                </span>
              ) : null,
            },
          ]}
        />
      </aside>
    </div>
  );
}

const SUPPORT_CATEGORIES = [
  "Technical Issue",
  "Billing",
  "Account Access",
  "Feature Request",
  "Bug Report",
  "General Inquiry",
  "Other",
] as const;

function validateTitle(v: string): string | null {
  const t = v.trim();
  if (t.length < 5) return "Title must be at least 5 characters";
  if (t.length > 200) return "Title must be at most 200 characters";
  if (/\s{2,}/.test(t)) return "Title cannot have multiple consecutive spaces";
  if (!/[A-Za-z0-9]/.test(t)) return "Title must contain at least one letter or number";
  return null;
}

function CreateTicketDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("MEDIUM");
  const create = useCreateSupportTicket();

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (titleError) setTitleError(null);
  }, [titleError]);
  const handleDescChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handlePriorityChange = useCallback((v: string) => setPriority(v as SupportTicketPriority), []);
  const handleCategoryChange = useCallback((v: string) => {
    setCategory(v);
    if (v) setCategoryError(null);
  }, []);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    setTitle("");
    setTitleError(null);
    setCategory("");
    setCategoryError(null);
    setDescription("");
    setPriority("MEDIUM");
  }, [onOpenChange]);

  const handleCreate = useCallback(() => {
    const err = validateTitle(title);
    if (err) { setTitleError(err); return; }
    if (!category) {
      setCategoryError("Please select a category");
      return;
    }
    if (description.trim().length > 0 && description.trim().length < 10) {
      toast.error("Description must be at least 10 characters if provided");
      return;
    }
    create.mutate(
      { title: title.trim(), category, description, priority },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle("");
          setTitleError(null);
          setCategory("");
          setCategoryError(null);
          setDescription("");
          setPriority("MEDIUM");
          toast.success("Ticket created");
        },
      }
    );
  }, [create, title, category, description, priority, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="sm" className="w-full">
        <SheetHeader className="border-b border-border"><SheetTitle>New Support Ticket</SheetTitle></SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
          <div>
            <Label className="text-sm">Title <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={handleTitleChange}
              placeholder="Brief description of the issue"
              className={`mt-1 ${titleError ? "border-destructive" : ""}`}
              maxLength={200}
            />
            {titleError && <p className="text-xs text-destructive mt-1">{titleError}</p>}
          </div>
          <div>
            <Label className="text-sm">Category <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className={cn("mt-1", categoryError ? "border-destructive" : "")}><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {SUPPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryError && <p className="text-xs text-destructive mt-1">{categoryError}</p>}
          </div>
          <div>
            <Label className="text-sm">Description</Label>
            <Textarea value={description} onChange={handleDescChange} placeholder="Detailed description..." className="mt-1 min-h-20" />
          </div>
          <div>
            <Label className="text-sm">Priority</Label>
            <Select value={priority} onValueChange={handlePriorityChange}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low (48h SLA)</SelectItem>
                <SelectItem value="MEDIUM">Medium (24h SLA)</SelectItem>
                <SelectItem value="HIGH">High (8h SLA)</SelectItem>
                <SelectItem value="URGENT">Urgent (2h SLA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || !category || create.isPending} loading={create.isPending}>
            Create Ticket
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
