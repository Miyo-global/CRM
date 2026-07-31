"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Ticket,
  Paperclip,
  ExternalLink,
  Send,
  Lock,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AISuggestReplyButton } from "@/features/hr/helpdesk/ai-suggest-reply-button";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { HelpdeskTicket, TicketStatus } from "@/types/hr";
import {
  useHelpdeskTicketComments,
  useAddHelpdeskTicketComment,
  useUpdateHelpdeskTicket,
  useHelpdeskAssignees,
  type HelpdeskTicketComment,
} from "@/lib/api/hooks/hr/helpdesk";

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const CATEGORY_ROUTING: Record<string, string> = {
  "IT Support": "IT & Operations team",
  "HR Query": "HR team",
  Facilities: "Facilities / Admin team",
  Finance: "Finance team",
  "Access Request": "IT & HR (access provisioning)",
  Equipment: "IT & Facilities team",
  Other: "HR triage queue",
};

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];

function statusBadgeVariant(
  status: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "DONE":
      return "default";
    case "IN_PROGRESS":
      return "secondary";
    case "IN_REVIEW":
      return "outline";
    default:
      return "destructive";
  }
}

function priorityBadgeVariant(
  priority: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  switch (priority) {
    case "URGENT":
      return "destructive";
    case "HIGH":
      return "default";
    case "MEDIUM":
      return "secondary";
    default:
      return "outline";
  }
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatusChangeEntry({ comment }: { comment: HelpdeskTicketComment }) {
  const from = comment.metadata?.from ?? null;
  const to = comment.metadata?.to ?? null;
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
        <ArrowRight className="h-3 w-3" />
      </div>
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">{comment.authorName ?? "Someone"}</span>
        changed status
        {from && (
          <>
            from{" "}
            <Badge variant={statusBadgeVariant(from)} className="text-[10px]">
              {STATUS_LABELS[from] ?? from}
            </Badge>
          </>
        )}
        to{" "}
        <Badge variant={statusBadgeVariant(to)} className="text-[10px]">
          {to ? STATUS_LABELS[to] ?? to : ""}
        </Badge>
        {comment.createdAt && (
          <span className="text-muted-foreground/70">
            &middot; {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        )}
      </span>
    </div>
  );
}

function CommentEntry({ comment }: { comment: HelpdeskTicketComment }) {
  const isInternal = comment.kind === "internal_note";
  return (
    <div className="flex gap-2.5">
      <Avatar className="h-7 w-7 shrink-0">
        {comment.authorImage && <AvatarImage src={comment.authorImage} alt={comment.authorName ?? ""} />}
        <AvatarFallback className="text-[10px]">{initials(comment.authorName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.authorName ?? "System"}</span>
          {isInternal && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-300 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            >
              <Lock className="h-2.5 w-2.5" />
              Internal
            </Badge>
          )}
          {comment.createdAt && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          )}
        </div>
        <div
          className={
            isInternal
              ? "mt-1 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-900/20"
              : "mt-1 rounded-md border bg-muted/30 p-2.5"
          }
        >
          <p
            className={
              isInternal
                ? "whitespace-pre-wrap text-sm leading-relaxed text-amber-900 dark:text-amber-100"
                : "whitespace-pre-wrap text-sm leading-relaxed"
            }
          >
            {comment.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TicketDetailSheet({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: HelpdeskTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const isAdmin = isAdminOrOwner(session?.user?.role);
  const isAssignee = !!ticket && ticket.assigneeId === session?.user?.id;
  const canAddInternal = isAdmin || isAssignee;

  const ticketId = ticket?.id ?? null;
  const { data: comments, isLoading: commentsLoading } = useHelpdeskTicketComments(
    open ? ticketId : null,
  );
  const addComment = useAddHelpdeskTicketComment(ticketId ?? 0);
  const updateTicket = useUpdateHelpdeskTicket(ticketId ?? 0);
  const { data: assignees } = useHelpdeskAssignees(open && isAdmin);

  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);

  const assigneeOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...(assignees ?? []).map((m) => ({
        value: m.userId,
        label: m.name ? `${m.name} (${m.role})` : m.email,
      })),
    ],
    [assignees],
  );

  const assigneeName = useMemo(() => {
    if (!ticket?.assigneeId) return null;
    const match = (assignees ?? []).find((m) => m.userId === ticket.assigneeId);
    return match?.name ?? match?.email ?? null;
  }, [assignees, ticket?.assigneeId]);

  if (!ticket) return null;

  const isResolved = ticket.status === "DONE";

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    addComment.mutate(
      { body: trimmed, kind: internal ? "internal_note" : "comment" },
      {
        onSuccess: () => {
          setBody("");
          setInternal(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  const handleStatusChange = (value: string) => {
    if (value === ticket.status) return;
    updateTicket.mutate(
      { status: value as TicketStatus },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  };

  const handleAssigneeChange = (value: string) => {
    const next = value === "" ? null : value;
    if (next === (ticket.assigneeId ?? null)) return;
    updateTicket.mutate(
      { assigneeId: next },
      {
        onSuccess: () => toast.success(next ? "Ticket assigned" : "Ticket unassigned"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-snug">{ticket.title}</SheetTitle>
              <SheetDescription className="mt-1 text-xs">
                #{ticket.id} &middot;{" "}
                {ticket.createdAt ? format(new Date(ticket.createdAt), "dd MMM yyyy, HH:mm") : ""}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {(isAdmin || isAssignee) ? (
                <Select value={ticket.status ?? "TODO"} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-7 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={statusBadgeVariant(ticket.status)}>
                  {STATUS_LABELS[ticket.status ?? "TODO"] ?? ticket.status ?? "To Do"}
                </Badge>
              )}
              <Badge variant={priorityBadgeVariant(ticket.priority)}>
                {ticket.priority ?? "MEDIUM"}
              </Badge>
              {ticket.category && <Badge variant="outline">{ticket.category}</Badge>}
            </div>

            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Routing:</span>{" "}
                {ticket.category
                  ? `${CATEGORY_ROUTING[ticket.category] ?? "HR team"} (category: ${ticket.category})`
                  : "HR triage queue"}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Queue:</span> HR Helpdesk — visible to HR and leadership.
                {assigneeName
                  ? ` Assigned to ${assigneeName} for resolution.`
                  : " Awaiting assignment by HR."}
              </p>
            </div>

            <div className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Assignee
                </p>
                {!isAdmin && (
                  <span className="flex items-center gap-1.5 text-sm">
                    {assigneeName ? (
                      <>
                        <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                        {assigneeName}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </span>
                )}
              </div>
              {isAdmin && (
                <div className="mt-2">
                  <SearchableSelect
                    options={assigneeOptions}
                    value={ticket.assigneeId ?? ""}
                    onValueChange={handleAssigneeChange}
                    placeholder="Assign to support user…"
                    searchPlaceholder="Search members…"
                    emptyText="No members found."
                    disabled={updateTicket.isPending}
                  />
                </div>
              )}
            </div>

            {ticket.description && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
              </div>
            )}

            {isResolved && ticket.resolution && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Resolution
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                  {ticket.resolution}
                </p>
                {ticket.resolvedAt && (
                  <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-500">
                    Resolved {formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            )}

            {ticket.attachmentUrl && (
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Attachment
                </p>
                <a
                  href={ticket.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  View attachment
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </div>
            )}

            <Separator />

            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Conversation
              </p>
              {commentsLoading ? (
                <p className="text-sm text-muted-foreground">Loading conversation…</p>
              ) : !comments || comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity yet. Start the conversation below.
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((c) =>
                    c.kind === "status_change" ? (
                      <StatusChangeEntry key={c.id} comment={c} />
                    ) : (
                      <CommentEntry key={c.id} comment={c} />
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="shrink-0 space-y-2 border-t px-5 py-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={internal ? "Add an internal note (only support staff can see this)…" : "Write a reply…"}
            rows={3}
            className={
              internal
                ? "resize-none border-amber-300 focus-visible:ring-amber-400 dark:border-amber-700"
                : "resize-none"
            }
          />
          <div className="flex items-center justify-between">
            {canAddInternal ? (
              <div className="flex items-center gap-2">
                <Switch id="internal-note" checked={internal} onCheckedChange={setInternal} />
                <Label htmlFor="internal-note" className="flex items-center gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Internal note
                </Label>
              </div>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={handleSend} disabled={addComment.isPending || !body.trim()}>
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {addComment.isPending ? "Sending…" : internal ? "Add note" : "Send"}
            </Button>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row justify-between border-t px-5 py-3">
          <AISuggestReplyButton ticketId={ticket.id} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
