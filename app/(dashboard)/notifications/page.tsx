"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CheckCheck,
  Trash2,
  X,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/lib/api/hooks/notifications";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Tone } from "@/lib/design/tones";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
type TabFilter = "ALL" | "UNREAD" | NotificationType;

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Info; tone: Tone; label: string }> = {
  INFO: { icon: Info, tone: "info", label: "Info" },
  SUCCESS: { icon: CheckCircle2, tone: "success", label: "Success" },
  WARNING: { icon: AlertTriangle, tone: "warning", label: "Warning" },
  ERROR: { icon: XCircle, tone: "danger", label: "Error" },
};

function dayGroup(date: Date | string | null): string {
  if (!date) return "Earlier";
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return "Earlier";
}

function isSafeInAppPath(link: string): boolean {
  return link.startsWith("/") && !link.startsWith("//");
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const isUnreadOnly = activeTab === "UNREAD";
  const { data: notifications, isLoading, error, refetch } = useNotifications(isUnreadOnly, 50);
  const { data: unreadData } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteOne = useDeleteNotification();

  const unreadCount = unreadData?.count ?? 0;

  const filtered = (notifications ?? []).filter((n) => {
    if (activeTab === "ALL" || activeTab === "UNREAD") return true;
    return n.type === activeTab;
  });

  const allSelected = filtered.length > 0 && filtered.every((n) => selected.has(n.id));
  const someSelected = selected.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  }, [allSelected, filtered]);

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function handleNotificationClick(notification: { id: number; isRead: boolean; link: string | null }) {
    if (!notification.isRead) markRead.mutate(notification.id);
    if (notification.link && isSafeInAppPath(notification.link)) router.push(notification.link);
  }

  function handleMarkAllRead() {
    markAllRead.mutate(undefined);
  }

  async function handleBulkMarkRead() {
    const ids = Array.from(selected);
    setBulkPending(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => markRead.mutateAsync(id)));
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      setSelected(new Set());
      if (succeeded > 0) {
        toast.success(`${succeeded} notification${succeeded !== 1 ? "s" : ""} marked as read`);
      }
      if (failed > 0) {
        toast.error(`Failed to mark ${failed} notification${failed !== 1 ? "s" : ""} as read`);
      }
    } finally {
      setBulkPending(false);
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    setBulkPending(true);
    try {
      await Promise.all(ids.map((id) => deleteOne.mutateAsync(id)));
      setSelected(new Set());
      toast.success(`${ids.length} notification${ids.length !== 1 ? "s" : ""} deleted`);
    } catch {
      toast.error("Failed to delete some notifications");
    } finally {
      setBulkPending(false);
    }
  }

  const groups: { label: string; items: typeof filtered }[] = [];
  for (const n of filtered) {
    const label = dayGroup(n.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  const tabsFilter = (
    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabFilter); setSelected(new Set()); }}>
      <TabsList variant="underline">
        <TabsTrigger value="ALL">All</TabsTrigger>
        <TabsTrigger value="UNREAD">
          Unread
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-soft px-1.5 text-2xs font-semibold tabular-nums text-brand-soft-foreground">
              {unreadCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="INFO">Info</TabsTrigger>
        <TabsTrigger value="SUCCESS">Success</TabsTrigger>
        <TabsTrigger value="WARNING">Warning</TabsTrigger>
        <TabsTrigger value="ERROR">Error</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const isTypeFilter = activeTab !== "ALL" && activeTab !== "UNREAD";

  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      badge={unreadCount > 0 ? unreadCount : undefined}
      actions={
        <Button
          variant="ghost"
          size="sm"
          disabled={unreadCount === 0}
          loading={markAllRead.isPending}
          onClick={handleMarkAllRead}
        >
          {!markAllRead.isPending && <CheckCheck aria-hidden="true" />}
          Mark all as read
        </Button>
      }
      filters={tabsFilter}
    >
      {isLoading ? (
        <Card className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </Card>
      ) : error ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        isTypeFilter && (notifications?.length ?? 0) > 0 ? (
          <EmptyState
            title="No results for these filters"
            description="No notifications match this type."
            action={{ label: "Clear filters", onClick: () => setActiveTab("ALL") }}
          />
        ) : (
          <EmptyState
            title={activeTab === "UNREAD" ? "You're all caught up" : "No notifications yet"}
            description={
              activeTab === "UNREAD"
                ? "All your notifications have been read. Check back later for new updates."
                : "When something important happens, you'll see it here."
            }
          />
        )
      ) : (
        <div className="space-y-4 pb-16">
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all notifications"
            />
            <span className="text-xs text-muted-foreground">Select all</span>
          </div>

          {groups.map((group) => (
            <section key={group.label} className="space-y-2">
              <h2 className="px-1 font-sans text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <Card className="divide-y divide-border overflow-hidden">
                {group.items.map((notification) => {
                  const typeKey = (notification.type ?? "INFO") as NotificationType;
                  const config = TYPE_CONFIG[typeKey];
                  const isUnread = !notification.isRead;
                  const isChecked = selected.has(notification.id);
                  const created = notification.createdAt ? new Date(notification.createdAt) : null;

                  return (
                    <div
                      key={notification.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "group flex cursor-pointer items-start gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent",
                        isChecked && "bg-brand-soft/60"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target === e.currentTarget) handleNotificationClick(notification);
                      }}
                    >
                      <div className="flex shrink-0 items-center pt-2.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelect(notification.id)}
                          aria-label={`Select notification: ${notification.title}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <IconChip icon={config.icon} tone={config.tone} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={cn(
                            "truncate font-sans text-sm tracking-normal",
                            isUnread ? "font-semibold text-foreground" : "font-normal text-muted-foreground"
                          )}>
                            {notification.title}
                          </h3>
                          <StatusPill tone={config.tone}>{config.label}</StatusPill>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 pt-0.5">
                        <time
                          className="text-xs tabular-nums text-muted-foreground"
                          dateTime={created?.toISOString()}
                          title={created ? format(created, "PPpp") : undefined}
                        >
                          {formatRelativeTime(notification.createdAt)}
                        </time>
                        {isUnread && (
                          <span className="size-1.5 rounded-full bg-gold-400" aria-label="Unread" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}

      {someSelected && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          className="fixed bottom-6 left-1/2 z-sticky flex h-11 max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-secondary px-4 text-secondary-foreground shadow-lg animate-fade-up"
        >
          <span className="whitespace-nowrap text-sm font-medium tabular-nums">{selected.size} selected</span>
          <Button
            size="xs"
            variant="ghost"
            className="text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
            loading={bulkPending}
            onClick={handleBulkMarkRead}
          >
            {!bulkPending && <CheckCheck aria-hidden="true" />}
            Mark read
          </Button>
          <Button
            size="xs"
            variant="destructive"
            disabled={bulkPending}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-secondary-foreground hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
            aria-label="Clear"
            onClick={() => setSelected(new Set())}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete notifications"
        description={`Delete ${selected.size} selected notification${selected.size !== 1 ? "s" : ""}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleBulkDelete}
      />
    </PageWrapper>
  );
}
