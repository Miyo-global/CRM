"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, Loader2, X } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import {
  useWatchers,
  useToggleWatch,
  useAddWatcher,
  useRemoveWatcher,
} from "@/lib/api/hooks/projects";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectMember } from "./types";

interface WatcherListProps {
  projectId: number;
  ticketId: number;
  members: ProjectMember[];
  canRemoveOtherWatchers?: boolean;
  readOnly?: boolean;
}

export function WatcherList({
  projectId,
  ticketId,
  members,
  canRemoveOtherWatchers = false,
  readOnly = false,
}: WatcherListProps) {
  const { data: session } = useSession();
  const { data: watchers = [], isLoading } = useWatchers(projectId, ticketId);
  const toggleWatch = useToggleWatch(projectId);
  const addWatcher = useAddWatcher(projectId);
  const removeWatcher = useRemoveWatcher(projectId);

  const currentUserId = session?.user?.id;
  const currentIdStr = currentUserId != null ? String(currentUserId) : "";
  const isWatching = watchers.some((w) => String(w.userId) === currentIdStr);
  const watcherUserIds = new Set(watchers.map((w) => String(w.userId)));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading watchers...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Eye className="h-3 w-3" /> Watchers
        </label>
        {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() =>
            toggleWatch.mutate({ ticketId, watching: isWatching })
          }
          disabled={toggleWatch.isPending}
        >
          {isWatching ? (
            <>
              <EyeOff className="h-3 w-3 mr-1" /> Unwatch
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 mr-1" /> Watch
            </>
          )}
        </Button>
        )}
      </div>

      {watchers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {watchers.map((w) => {
            const watcherIdStr = String(w.userId);
            const canRemoveSelf = !!currentIdStr && watcherIdStr === currentIdStr;
            const canRemove = !readOnly && (canRemoveSelf || canRemoveOtherWatchers);
            return (
              <div
                key={watcherIdStr}
                className="relative group inline-flex items-center gap-0.5"
                // The API returns `name`; reading only firstName/lastName left
                // the tooltip showing a raw id and the initials blank
                // (QA-0059).
                title={watcherDisplayName(w.user) ?? "Unnamed member"}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={resolveImageUrl(w.user?.image)} />
                  <AvatarFallback className="text-3xs bg-brand-soft text-brand-text">
                    {watcherInitials(w.user)}
                  </AvatarFallback>
                </Avatar>
                {canRemove && (
                  <button
                    type="button"
                    aria-label={
                      canRemoveSelf
                        ? "Remove yourself from watchers"
                        : "Remove watcher from ticket"
                    }
                    title="Remove watcher"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                    disabled={removeWatcher.isPending}
                    onClick={() =>
                      removeWatcher.mutate(
                        { ticketId, userId: watcherIdStr },
                        {
                          onSuccess: () => toast.success("Watcher removed"),
                          onError: (e) => toast.error(getApiError(e)),
                        }
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && (
      <Select
        value=""
        onValueChange={(userId) => {
          if (!userId) return;
          addWatcher.mutate({ ticketId, userId });
        }}
      >
        <SelectTrigger className="h-8 w-full text-xs bg-background">
          <SelectValue placeholder="+ Add watcher" />
        </SelectTrigger>
        <SelectContent>
          {members
            .filter((m) => !watcherUserIds.has(String(m.id)))
            .map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center gap-2">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{m.firstName ?? m.name}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      )}
    </div>
  );
}

interface WatcherUser {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

function watcherDisplayName(user?: WatcherUser | null): string | null {
  if (!user) return null;
  const fromParts = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fromParts || user.name?.trim() || user.email?.trim() || null;
}

function watcherInitials(user?: WatcherUser | null): string {
  const name = watcherDisplayName(user);
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
