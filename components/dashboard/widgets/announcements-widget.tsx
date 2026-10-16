"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { WidgetError } from "@/components/dashboard/widgets/view-all-link";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Matches the cap enforced by POST /api/dashboard/announcements. */
const ANNOUNCEMENT_MAX_CHARS = 2000;
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
} from "@/lib/api/hooks/dashboard";
import { Megaphone, X, Pin, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toneDot, toneText } from "@/lib/design/tones";

const MAX_ROWS = 6;

export function AnnouncementsWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";

  const { data, isLoading, error, refetch } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;
    createMutation.mutate(
      { content: content.trim(), isPinned },
      {
        onSuccess: () => {
          setContent("");
          setIsPinned(false);
          setShowForm(false);
          toast.success("Announcement posted");
        },
        onError: () => toast.error("Failed to post announcement"),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
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
        isAdmin && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowForm((v) => !v)}
            aria-label="Add announcement"
          >
            <Plus aria-hidden="true" />
            Add
          </Button>
        )
      }
      contentClassName="space-y-3"
    >
      {showForm && isAdmin && (
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
                onClick={() => { setShowForm(false); setContent(""); }}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                onClick={handleSubmit}
                loading={createMutation.isPending}
                disabled={!content.trim()}
                aria-label="Post announcement"
              >
                {createMutation.isPending ? "Posting..." : "Post"}
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
          {data.slice(0, MAX_ROWS).map((ann) => {
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
                  <p className="text-sm leading-snug text-foreground">{ann.content}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {ann.isPinned && (
                      <Pin className={cn("size-3 shrink-0", toneText.warning)} aria-label="Pinned" />
                    )}
                    <span className="truncate text-xs text-muted-foreground tabular-nums">
                      {authorDisplay} · {format(parseISO(ann.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDelete(ann.id)}
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
    </WidgetCard>
  );
}
