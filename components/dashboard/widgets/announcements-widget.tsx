"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { ViewAllLink, WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** Matches the cap enforced by POST /api/dashboard/announcements. */
const ANNOUNCEMENT_MAX_CHARS = 2000;
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "@/lib/api/hooks/dashboard";
import { Megaphone, X, Pin, Plus, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toneDot, toneText } from "@/lib/design/tones";
import { hasHtmlTag, NO_HTML_MESSAGE } from "@/lib/validations/text-rules";

const MAX_ROWS = 6;

/** `maxRows` is the dashboard cap; /dashboard/announcements lists them all. */
export function AnnouncementsWidget({ maxRows = MAX_ROWS }: { maxRows?: number } = {}) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";

  const { data, isLoading, error, refetch } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  // The create form doubles as the edit form (BUG-16).
  const [editingId, setEditingId] = useState<number | null>(null);
  // BUG-23: posting the same text twice asks first.
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  // One click on X used to delete with no way back (BUG-34).
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const closeForm = () => {
    setContent("");
    setIsPinned(false);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (ann: { id: number; content: string; isPinned: boolean }) => {
    setEditingId(ann.id);
    setContent(ann.content);
    setIsPinned(ann.isPinned);
    setShowForm(true);
  };

  const handleSubmit = (allowDuplicate = false) => {
    if (!content.trim()) return;
    if (hasHtmlTag(content)) {
      toast.error(NO_HTML_MESSAGE);
      return;
    }
    const text = content.trim().toLowerCase();
    if (
      !allowDuplicate &&
      (data ?? []).some((a) => a.id !== editingId && a.content.trim().toLowerCase() === text)
    ) {
      setDuplicateOpen(true);
      return;
    }
    if (editingId !== null) {
      updateMutation.mutate(
        { id: editingId, content: content.trim(), isPinned },
        {
          onSuccess: () => {
            closeForm();
            toast.success("Announcement updated");
          },
          onError: () => toast.error("Failed to update announcement"),
        }
      );
      return;
    }
    createMutation.mutate(
      { content: content.trim(), isPinned },
      {
        onSuccess: () => {
          closeForm();
          toast.success("Announcement posted");
        },
        onError: () => toast.error("Failed to post announcement"),
      }
    );
  };
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Announcement deleted"),
      onError: () => toast.error("Failed to delete announcement"),
    });
  };

  return (
    <WidgetCard
      title="Announcements"
      icon={Megaphone}
      tone="warning"
      count={data?.length || undefined}
      actions={
        <>
          {/* Older ones were unreachable past the cap (P3-announcements-dashboard-widget-only-no-archive). */}
          {(data?.length ?? 0) > maxRows && (
            <ViewAllLink href="/dashboard/announcements" ariaLabel="View all announcements" />
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => (showForm ? closeForm() : setShowForm(true))}
              aria-label="Add announcement"
            >
              <Plus aria-hidden="true" />
              Add
            </Button>
          )}
        </>
      }
      contentClassName="space-y-3"
    >
      {showForm && (isAdmin || editingId !== null) && (
        <div className="space-y-2 rounded-md border border-border bg-surface-sunken/40 p-3">
          {/* The server caps this at 2,000 characters; the box used to
              accept any length and fail on submit (QA-D007). */}
          <Textarea
            placeholder="Write an announcement..."
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, ANNOUNCEMENT_MAX_CHARS))}
            maxLength={ANNOUNCEMENT_MAX_CHARS}
            className="min-h-18 resize-none bg-card text-sm"
            aria-label="Announcement content"
          />
          <p className="text-right text-2xs tabular-nums text-muted-foreground">
            {content.length}/{ANNOUNCEMENT_MAX_CHARS}
          </p>
          <div className="flex items-center justify-between gap-2">
            <label className="flex cursor-pointer select-none items-center gap-1.5">
              <Checkbox
                checked={isPinned}
                onCheckedChange={(v) => setIsPinned(v === true)}
                aria-label="Pin this announcement"
              />
              <span className="text-xs text-muted-foreground">Pin</span>
            </label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={closeForm}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                onClick={() => handleSubmit()}
                loading={isSaving}
                disabled={!content.trim()}
                aria-label={editingId !== null ? "Save announcement" : "Post announcement"}
              >
                {editingId !== null ? (isSaving ? "Saving..." : "Save") : isSaving ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <WidgetError error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          title="No announcements"
          description="Nothing to show yet."
          compact
        />
      ) : (
        <ul className="divide-y divide-border">
          {data.slice(0, maxRows).map((ann) => {
            const authorDisplay =
              ann.authorFirstName && ann.authorLastName
                ? `${ann.authorFirstName} ${ann.authorLastName}`
                : ann.authorName ?? "Team";
            return (
              <li key={ann.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    ann.isPinned ? toneDot.warning : "bg-border-strong"
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  {/* wrap-anywhere: one long token pushed the card wide (QA-BUG-27). */}
                  <p className="line-clamp-4 wrap-anywhere text-sm leading-snug text-foreground" title={ann.content}>
                    {ann.content}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {ann.isPinned && (
                      <Pin className={cn("size-3 shrink-0", toneText.warning)} aria-label="Pinned" />
                    )}
                    <span className="truncate text-xs text-muted-foreground tabular-nums">
                      {authorDisplay} · {format(parseISO(ann.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                {(isAdmin || ann.authorId === session?.user?.id) && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(ann)}
                    aria-label={`Edit announcement from ${authorDisplay}`}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPendingDelete(ann.id)}
                    aria-label={`Delete announcement from ${authorDisplay}`}
                    disabled={deleteMutation.isPending}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        title="This announcement is already posted"
        description="An announcement with the same text is on the dashboard. Post it again anyway?"
        confirmLabel="Post anyway"
        onConfirm={() => handleSubmit(true)}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this announcement?"
        description="It will be removed from everyone's dashboard. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => pendingDelete !== null && handleDelete(pendingDelete)}
      />
    </WidgetCard>
  );
}
