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
  Loader2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Send,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyTicketIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { getInitials } from "@/lib/format-utils";
import type { SupportTicketStatus, SupportTicketPriority, SupportTicket } from "@/types/support";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
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

  const { data: ticketsData, isLoading } = useSupportTickets({
    ...(statusFilter !== "all" ? { status: statusFilter as SupportTicketStatus } : {}),
    ...(priorityFilter !== "all" ? { priority: priorityFilter as SupportTicketPriority } : {}),
  });
  const { data: stats, isLoading: statsLoading } = useSupportStats();

  const tickets = ticketsData?.items ?? [];

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleStatusFilter = useCallback((v: string) => updateFilter("status", v), [updateFilter]);
  const handlePriorityFilter = useCallback((v: string) => updateFilter("priority", v), [updateFilter]);
  const handleBackFromTicket = useCallback(() => setSelectedTicketId(null), []);

  return (
    <>
      <PageWrapper
        title="Support Inbox"
        subtitle={
          statsLoading
            ? "Loading..."
            : `${(stats?.open ?? 0) + (stats?.in_progress ?? 0)} active tickets${(stats?.sla_breached ?? 0) > 0 ? ` · ${stats?.sla_breached} SLA breached` : ""}`
        }
        actions={
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 bg-gold hover:bg-gold/80 text-white">
            <Plus className="h-3.5 w-3.5" /> New Ticket
          </Button>
        }
        filters={
          <>
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
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
              <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        noInternalScroll
        contentClassName="flex overflow-hidden !py-0 !px-0"
      >
        <div className={cn("w-full md:w-[360px] border-r border-border/40 flex flex-col overflow-hidden", selectedTicketId && "hidden md:flex")}>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <EmptyState
                compact
                title="No tickets found"
                description="New tickets will appear here."
                action={{ label: "New Ticket", onClick: handleOpenCreate }}
                className="border-0 bg-transparent"
              />
            ) : (
              <div className="divide-y divide-border/30">
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

        <div className={cn("flex-1 flex flex-col", !selectedTicketId && "hidden md:flex")}>
          {selectedTicketId ? (
            <TicketDetail ticketId={selectedTicketId} onBack={handleBackFromTicket} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <EmptyTicketIllustration className="mx-auto mb-3 w-40 h-40" />
                <p className="text-sm font-medium text-foreground">Select a ticket</p>
                <p className="text-xs text-muted-foreground mt-1">Choose a ticket from the list to view its details</p>
              </div>
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
      onClick={handleClick}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors",
        isSelected && "bg-muted/50 border-l-2 border-gold"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate">{toTitleCase(ticket.title)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            #{ticket.id} {ticket.client?.name ? `- ${ticket.client.name}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", PRIORITY_COLORS[ticket.priority])}>
            {ticket.priority}
          </Badge>
          {isBreached && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0">SLA</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <StatusIcon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">{ticket.status.replace("_", " ")}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
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
  const handleToggleInternal = useCallback(() => setIsInternal((v) => !v), []);
  const handleReplyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value), []);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  }, [handleReply]);

  if (isLoading || !ticket) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isBreached = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date() && !["RESOLVED", "CLOSED"].includes(ticket.status);
  const messages = [...(ticket.messages ?? [])].reverse();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="md:hidden h-7 px-2">Back</Button>
            <div>
              <h3 className="text-sm font-bold">{toTitleCase(ticket.title)}</h3>
              <p className="text-[11px] text-muted-foreground">#{ticket.id} {ticket.client?.name ? `- ${ticket.client.name}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</Badge>
            {isBreached && <Badge variant="destructive" className="text-xs">SLA Breached</Badge>}
            <Select value={ticket.status} onValueChange={handleStatusValueChange}>
              <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue /></SelectTrigger>
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

      <ScrollArea className="flex-1 px-4 py-3">
        {ticket.description && (
          <div className="bg-muted/30 rounded-lg p-3 mb-4 text-sm">{toSentenceCase(ticket.description)}</div>
        )}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2.5">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={resolveImageUrl(msg.author?.image)} />
                <AvatarFallback className="text-[9px]">{getInitials(msg.author?.name)}</AvatarFallback>
              </Avatar>
              <div className={cn(
                "flex-1 min-w-0 rounded-lg px-3 py-2",
                msg.isInternal
                  ? "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                  : "bg-muted/20"
              )}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{msg.author?.name}</span>
                  {msg.isInternal && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5 border-amber-400 text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700">
                      <Lock className="h-2.5 w-2.5" /> Internal
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                  </span>
                </div>
                <p className="text-[13px] mt-0.5 whitespace-pre-wrap">{msg.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border/40 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Switch checked={isInternal} onCheckedChange={setIsInternal} className="h-4 w-7" />
            <Label className="text-[11px] text-muted-foreground cursor-pointer" onClick={handleToggleInternal}>
              {isInternal ? "Internal note (not visible to client)" : "Public reply"}
            </Label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAiReply}
            disabled={aiReply.isPending}
            className="h-6 text-[11px] text-muted-foreground gap-1 px-2"
            aria-label="Generate AI reply suggestion"
          >
            {aiReply.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI Reply
          </Button>
        </div>
        <div className="flex gap-2">
          <Textarea
            value={replyText}
            onChange={handleReplyChange}
            placeholder={isInternal ? "Add internal note..." : "Type your reply..."}
            className="min-h-[60px] max-h-[120px] text-sm resize-none"
            onKeyDown={handleKeyDown}
          />
          <Button
            onClick={handleReply}
            disabled={!replyText.trim() || addMessage.isPending}
            size="icon"
            className="h-[60px] w-10 shrink-0 bg-gold hover:bg-gold/80 text-white"
            aria-label="Send reply"
          >
            {addMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
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
      <SheetContent className="sm:max-w-md">
        <SheetHeader><SheetTitle>New Support Ticket</SheetTitle></SheetHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={handleTitleChange}
              placeholder="Brief description of the issue"
              className={`mt-1 ${titleError ? "border-destructive" : ""}`}
              maxLength={200}
            />
            {titleError && <p className="text-[11px] text-destructive mt-1">{titleError}</p>}
          </div>
          <div>
            <Label className="text-xs">Category <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className={cn("mt-1", categoryError ? "border-destructive" : "")}><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {SUPPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryError && <p className="text-[11px] text-destructive mt-1">{categoryError}</p>}
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={handleDescChange} placeholder="Detailed description..." className="mt-1 min-h-[80px]" />
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || !category || create.isPending} className="bg-gold hover:bg-gold/80 text-white">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Ticket
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
