"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyMailIllustration } from "@/components/illustrations";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
} from "@/lib/api/hooks/dashboard";
import { Megaphone, X, Pin, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AnnouncementsWidget() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";

  const { data, isLoading, error } = useAnnouncements();
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
    <Card className="h-full flex flex-col bg-warning-soft border-warning-strong/25">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-warning-strong shrink-0" aria-hidden="true" />
          <CardTitle className="text-sm font-semibold text-warning-strong">
            Announcements
          </CardTitle>
        </div>
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-warning-strong hover:text-warning-strong hover:bg-warning-soft"
            onClick={() => setShowForm((v) => !v)}
            aria-label="Add announcement"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="ml-1 text-xs">Add</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden space-y-3">
        {showForm && isAdmin && (
          <div className="space-y-2 rounded-lg border border-warning-strong/25 bg-card p-3">
            <Textarea
              placeholder="Write an announcement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-sm min-h-[72px] resize-none bg-transparent border-warning-strong/25 focus-visible:ring-warning-400"
              aria-label="Announcement content"
            />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-warning-strong/25 text-warning-strong focus:ring-warning-400"
                  aria-label="Pin this announcement"
                />
                <span className="text-xs text-warning-strong">Pin</span>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setShowForm(false); setContent(""); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs bg-warning hover:bg-warning-700 text-warning-foreground"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !content.trim()}
                  aria-label="Post announcement"
                >
                  {createMutation.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg bg-warning-soft" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load announcements.</p>
        ) : !data?.length ? (
          <EmptyState
            illustration={<EmptyMailIllustration className="h-20 w-20" />}
            title="No announcements"
            description="Nothing to show yet."
            compact
          />
        ) : (
          <ul className="space-y-2 overflow-y-auto max-h-64">
            {data.map((ann) => {
              const authorDisplay =
                ann.authorFirstName && ann.authorLastName
                  ? `${ann.authorFirstName} ${ann.authorLastName}`
                  : ann.authorName ?? "Team";
              return (
                <li
                  key={ann.id}
                  className={cn(
                    "relative rounded-lg border p-3 text-sm",
                    ann.isPinned
                      ? "border-warning-400 bg-warning-soft"
                      : "border-warning-strong/25 bg-card"
                  )}
                >
                  {ann.isPinned && (
                    <Pin
                      className="absolute top-2 right-2 h-3 w-3 text-warning-strong"
                      aria-label="Pinned"
                    />
                  )}
                  <p className="text-warning-strong leading-snug pr-4">
                    {ann.content}
                  </p>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-2xs text-warning-strong">
                      {authorDisplay} · {format(parseISO(ann.createdAt), "MMM d, yyyy")}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(ann.id)}
                        className="text-warning-strong hover:text-warning-strong transition-colors"
                        aria-label={`Delete announcement from ${authorDisplay}`}
                        disabled={deleteMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
