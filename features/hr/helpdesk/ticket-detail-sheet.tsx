"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { format, formatDistanceToNow } from "date-fns";
import { Paperclip, ExternalLink, Send, Lock, UserPlus, Trash2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { StatusPill } from "@/components/ui/status-pill";
import { PropertyList } from "@/components/shared/property-list";
import type { Tone } from "@/lib/design/tones";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CharCount } from "@/components/ui/char-count";
import { HELPDESK_COMMENT_MAX } from "@/lib/validations/common-forms";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { HelpdeskTicket, TicketPriority, TicketStatus } from "@/types/hr";
import { PRIORITY_OPTIONS } from "@/features/hr/helpdesk/helpdesk-create-ticket-form";
import { getRoleLabel } from "@/lib/rbac/roles";
import { TICKET_STATUSES, TICKET_STATUS_LABELS, ticketStatusLabel } from "@/lib/labels";
import {
  useHelpdeskTicketComments,
  useAddHelpdeskTicketComment,
  useUpdateHelpdeskTicket,
  useHelpdeskAssignees,
  useDeleteHelpdeskTicket,
  type HelpdeskTicketComment,
} from "@/lib/api/hooks/hr/helpdesk";


const CATEGORY_ROUTING: Record<string, string> = {
  "IT Support": "IT & Operations team",
  "HR Query": "HR team",
  Facilities: "Facilities / Admin team",
  Finance: "Finance team",
  "Access Request": "IT & HR (access provisioning)",
  Equipment: "IT & Facilities team",
  Other: "HR triage queue",
};

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = TICKET_STATUSES.map((value) => ({
  value,
  label: TICKET_STATUS_LABELS[value],
}));

function statusTone(status: string | null): Tone {
  switch (status) {
    case "DONE":
    case "CLOSED":
      return "success";
    case "CANCELLED":
      return "neutral";
    case "IN_PROGRESS":
      return "info";
    case "IN_REVIEW":
      return "plum";
    default:
      return "warning";
  }
}

function priorityTone(priority: string | null): Tone {
  switch (priority) {
    case "URGENT":
      return "danger";
    case "HIGH":
      return "warning";
    case "MEDIUM":
      return "brand";
    default:
      return "neutral";
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

function AssignmentEntry({ comment }: { comment: HelpdeskTicketComment }) {
  const to = comment.metadata?.to ?? null;
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">{comment.authorName ?? "Someone"}</span>
        <span>{to ? "assigned the ticket to" : "unassigned the ticket"}</span>
        {to && <span className="font-medium text-foreground">{comment.metadata?.toName ?? "a teammate"}</span>}
        {comment.createdAt && (
          <span className="text-subtle-foreground">
            &middot; {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        )}
      </span>
    </div>
  );
}

function StatusChangeEntry({ comment }: { comment: HelpdeskTicketComment }) {
  const from = comment.metadata?.from ?? null;
  const to = comment.metadata?.to ?? null;
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">{comment.authorName ?? "Someone"}</span>
        {/* JSX drops the newline, so this read "changed statusfrom"
            (QA-D009). */}
        <span>changed status</span>
        {from && (
          <>
            <span>from</span>{" "}
            <StatusPill tone={statusTone(from)}>
              {ticketStatusLabel(from)}
            </StatusPill>
          </>
        )}
        to{" "}
        <StatusPill tone={statusTone(to)}>
          {to ? ticketStatusLabel(to) : ""}
        </StatusPill>
        {comment.createdAt && (
          <span className="text-subtle-foreground">
            &middot; {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
        )}
      </span>
    </div>
  );
}

function PriorityChangeEntry({ comment }: { comment: HelpdeskTicketComment }) {
  const from = comment.metadata?.from ?? null;
  const to = comment.metadata?.to ?? null;
  const label = (p: string | null) => PRIORITY_OPTIONS.find((o) => o.value === p)?.label ?? "Medium";
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">{comment.authorName ?? "Someone"}</span>
        <span>changed priority</span>
        {from && (
          <>
            <span>from</span>{" "}
            <StatusPill tone={priorityTone(from)}>{label(from)}</StatusPill>
          </>
        )}
        to{" "}
        <StatusPill tone={priorityTone(to)}>{label(to)}</StatusPill>
        {comment.createdAt && (
          <span className="text-subtle-foreground">
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
      <Avatar className="size-7 shrink-0">
        {comment.authorImage && <AvatarImage src={comment.authorImage} alt={comment.authorName ?? ""} />}
        <AvatarFallback className="text-2xs">{initials(comment.authorName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{comment.authorName ?? "System"}</span>
          {isInternal && (
            <StatusPill tone="warning">
              <Lock aria-hidden="true" />
              Internal
            </StatusPill>
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
              ? "mt-1 rounded-md border border-warning-500/30 bg-warning-soft p-3"
              : "mt-1 rounded-md border border-border bg-surface-sunken/60 p-3"
          }
        >
          <p
            className={
              isInternal
                ? "whitespace-pre-wrap text-sm leading-relaxed text-warning-strong"
                : "whitespace-pre-wrap text-sm leading-relaxed text-foreground"
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Moving to Done or Closed asks for an optional resolution note (R2-HD-01).
  const [resolving, setResolving] = useState<TicketStatus | null>(null);
  const [resolutionDraft, setResolutionDraft] = useState("");
  const deleteTicket = useDeleteHelpdeskTicket();
  // Title editing (QA-BUG-17): null while not editing. savedTitle shows the
  // new title at once; the ticket prop is a snapshot from the list.
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState<{ id: number; title: string } | null>(null);

  const assigneeOptions = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...(assignees ?? []).map((m) => ({
        value: m.userId,
        label: m.name ? `${m.name} (${getRoleLabel(m.role)})` : m.email,
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

  const isResolved = ticket.status === "DONE" || ticket.status === "CLOSED";
  const title = savedTitle?.id === ticket.id ? savedTitle.title : ticket.title;
  const canEditTitle = !isResolved && (isAdmin || ticket.userId === session?.user?.id);

  const handleTitleSave = () => {
    const next = titleDraft?.trim() ?? "";
    if (!next || next === title) {
      setTitleDraft(null);
      return;
    }
    updateTicket.mutate(
      { title: next },
      {
        onSuccess: () => {
          setSavedTitle({ id: ticket.id, title: next });
          setTitleDraft(null);
          toast.success("Title updated");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };

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
    if ((value === "DONE" || value === "CLOSED") && !isResolved) {
      setResolutionDraft(ticket.resolution ?? "");
      setResolving(value as TicketStatus);
      return;
    }
    updateTicket.mutate(
      { status: value as TicketStatus },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  };

  const confirmResolve = () => {
    if (!resolving) return;
    const resolution = resolutionDraft.trim();
    updateTicket.mutate(
      { status: resolving, ...(resolution ? { resolution } : {}) },
      {
        onSuccess: () => setResolving(null),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
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
      <SheetContent size="md" className="flex flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 border-b px-5 pb-4 pt-5 pr-12">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {titleDraft !== null ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleTitleSave();
                  }}
                >
                  <SheetTitle className="sr-only">{title}</SheetTitle>
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    maxLength={200}
                    aria-label="Ticket title"
                    autoFocus
                    className="h-8"
                  />
                  <Button type="submit" size="sm" disabled={updateTicket.isPending || titleDraft.trim().length < 3}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setTitleDraft(null)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="flex items-start gap-1">
                  <SheetTitle className="min-w-0 wrap-anywhere font-display text-lg leading-snug">{title}</SheetTitle>
                  {canEditTitle && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => setTitleDraft(title)}
                      aria-label="Edit title"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              )}
              <SheetDescription className="mt-1 text-xs tabular-nums">
                <span className="font-mono">#{ticket.id}</span> &middot;{" "}
                {ticket.createdAt ? format(new Date(ticket.createdAt), "dd MMM yyyy, HH:mm") : ""}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 px-5 py-4">
            <PropertyList
              items={[
                {
                  label: "Status",
                  value:
                    isAdmin || isAssignee ? (
                      <Select value={ticket.status ?? "TODO"} onValueChange={handleStatusChange}>
                        <SelectTrigger size="sm" className="w-40" aria-label="Status">
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
                      <StatusPill tone={statusTone(ticket.status)} dot>
                        {ticketStatusLabel(ticket.status)}
                      </StatusPill>
                    ),
                },
                {
                  label: "Priority",
                  // Admins (HR included) can triage priority; the API allows the
                  // same people who can assign (R3-HR-09).
                  value: isAdmin && !isResolved ? (
                    <Select
                      value={ticket.priority ?? "MEDIUM"}
                      onValueChange={(value) => {
                        if (value === ticket.priority) return;
                        updateTicket.mutate(
                          { priority: value as TicketPriority },
                          {
                            onSuccess: () => toast.success("Priority updated"),
                            onError: (e) => toast.error(getErrorMessage(e)),
                          },
                        );
                      }}
                    >
                      <SelectTrigger size="sm" className="w-40" aria-label="Priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusPill tone={priorityTone(ticket.priority)}>
                      {PRIORITY_OPTIONS.find((p) => p.value === ticket.priority)?.label ?? "Medium"}
                    </StatusPill>
                  ),
                },
                {
                  label: "Category",
                  value: ticket.category ? <Badge variant="outline">{ticket.category}</Badge> : null,
                },
                {
                  label: "Assignee",
                  value: isAdmin ? (
                    <SearchableSelect
                      options={assigneeOptions}
                      value={ticket.assigneeId ?? ""}
                      onValueChange={handleAssigneeChange}
                      placeholder="Assign to support user…"
                      searchPlaceholder="Search members…"
                      emptyText="No members found."
                      disabled={updateTicket.isPending}
                    />
                  ) : assigneeName ? (
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {assigneeName}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  ),
                },
              ]}
            />

            <div className="rounded-md border border-dashed border-border bg-surface-sunken/40 px-3 py-2.5 text-xs text-muted-foreground">
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

            {ticket.description && (
              <div>
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{ticket.description}</p>
              </div>
            )}

            {isResolved && ticket.resolution && (
              <div className="rounded-md border border-success-500/30 bg-success-soft p-3">
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-success-strong">
                  Resolution
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-success-strong">
                  {ticket.resolution}
                </p>
                {ticket.resolvedAt && (
                  <p className="mt-1.5 text-xs text-success-strong">
                    Resolved {formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            )}

            {ticket.attachmentUrl && (
              <div>
                <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Attachment
                </p>
                <a
                  href={ticket.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-brand-text hover:underline focus-visible:focus-ring"
                >
                  <Paperclip className="size-3.5" aria-hidden="true" />
                  View attachment
                  <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
                </a>
              </div>
            )}

            <Separator />

            <div>
              <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conversation
              </p>
              {commentsLoading ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-14 w-full rounded-md" />
                  <Skeleton className="h-14 w-full rounded-md" />
                </div>
              ) : !comments || comments.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  No activity yet. Start the conversation below.
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((c) =>
                    c.kind === "status_change" ? (
                      <StatusChangeEntry key={c.id} comment={c} />
                    ) : c.kind === "assignment" ? (
                      <AssignmentEntry key={c.id} comment={c} />
                    ) : c.kind === "priority_change" ? (
                      <PriorityChangeEntry key={c.id} comment={c} />
                    ) : (
                      <CommentEntry key={c.id} comment={c} />
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="shrink-0 space-y-2 border-t bg-background px-5 py-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={internal ? "Add an internal note (only support staff can see this)…" : "Write a reply…"}
            rows={3}
            maxLength={HELPDESK_COMMENT_MAX}
            // Capped so Send stays on screen for a long reply (R3-HR-08).
            className={
              internal
                ? "max-h-48 resize-none border-warning-500/40 bg-warning-soft/40"
                : "max-h-48 resize-none"
            }
          />
          <CharCount length={body.length} max={HELPDESK_COMMENT_MAX} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {canAddInternal ? (
              <div className="flex items-center gap-2">
                <Switch id="internal-note" checked={internal} onCheckedChange={setInternal} />
                <Label htmlFor="internal-note" className="flex items-center gap-1 text-xs">
                  <Lock className="size-3" aria-hidden="true" />
                  Internal note
                </Label>
              </div>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={handleSend} disabled={addComment.isPending || !body.trim()} loading={addComment.isPending}>
              <Send className="size-3.5" aria-hidden="true" />
              {addComment.isPending ? "Sending…" : internal ? "Add note" : "Send"}
            </Button>
          </div>
        </div>

        <SheetFooter className="shrink-0 flex-row justify-between border-t bg-surface-sunken/40 px-5 py-3">
          <AISuggestReplyButton ticketId={ticket.id} />
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteTicket.isPending}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Delete ticket
            </Button>
          )}
        </SheetFooter>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this ticket?"
          description={`"${ticket.title}" and its conversation will be removed for everyone. This cannot be undone.`}
          confirmLabel="Delete ticket"
          destructive
          onConfirm={() =>
            deleteTicket.mutate(ticket.id, {
              onSuccess: () => {
                toast.success("Ticket deleted");
                onOpenChange(false);
              },
              onError: (e) => toast.error(getErrorMessage(e)),
            })
          }
        />
        <AlertDialog open={!!resolving} onOpenChange={(next) => !next && setResolving(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as {resolving ? ticketStatusLabel(resolving) : ""}?</AlertDialogTitle>
              <AlertDialogDescription>
                Add a resolution note so the requester knows what was done. It is optional.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="resolution-note">Resolution note (optional)</Label>
              <Textarea
                id="resolution-note"
                value={resolutionDraft}
                onChange={(e) => setResolutionDraft(e.target.value)}
                maxLength={5000}
                rows={4}
                className="resize-none"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button onClick={confirmResolve} loading={updateTicket.isPending}>
                Mark as {resolving ? ticketStatusLabel(resolving) : ""}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
