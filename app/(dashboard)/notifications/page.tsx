"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CheckCheck,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/lib/api/hooks/notifications";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyInboxIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
type TabFilter = "ALL" | "UNREAD" | NotificationType;

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: typeof Info; color: string; bg: string; label: string }
> = {
  INFO: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", label: "Info" },
  SUCCESS: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Success" },
  WARNING: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", label: "Warning" },
  ERROR: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Error" },
};

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

  const isUnreadOnly = activeTab === "UNREAD";
  const { data: notifications, isLoading } = useNotifications(isUnreadOnly, 50);
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

  const tabsFilter = (
    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabFilter); setSelected(new Set()); }}>
      <TabsList className="bg-card border border-border">
        <TabsTrigger value="ALL">All</TabsTrigger>
        <TabsTrigger value="UNREAD">
          Unread
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-semibold text-white">
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

  return (
    <PageWrapper
      title="Notifications"
      subtitle="Stay up to date with everything happening in your workspace"
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={handleMarkAllRead}
          className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold"
        >
          {markAllRead.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 h-4 w-4" />
          )}
          Mark all as read
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2 bg-gold/20 text-gold text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      }
      filters={tabsFilter}
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full max-w-md" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <EmptyInboxIllustration className="mb-5 opacity-95" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {activeTab === "UNREAD" ? "You're all caught up" : "No notifications yet"}
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {activeTab === "UNREAD"
              ? "All your notifications have been read. Check back later for new updates."
              : "When something important happens, you'll see it here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {someSelected && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 rounded-lg border border-border sticky top-0 z-10">
              <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={bulkPending}
                  onClick={handleBulkMarkRead}
                >
                  {bulkPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCheck className="h-3 w-3 mr-1" />}
                  Mark read
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={bulkPending}
                  onClick={handleBulkDelete}
                >
                  {bulkPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-1 pb-1">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all notifications"
              className="h-4 w-4"
            />
            <span className="text-xs text-muted-foreground">Select all</span>
          </div>

          {filtered.map((notification) => {
            const typeKey = (notification.type ?? "INFO") as NotificationType;
            const config = TYPE_CONFIG[typeKey];
            const Icon = config.icon;
            const isUnread = !notification.isRead;
            const isChecked = selected.has(notification.id);

            return (
              <div key={notification.id} className="flex items-start gap-3">
                <div className="flex items-center pt-4 pl-1 shrink-0">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleSelect(notification.id)}
                    aria-label={`Select notification: ${notification.title}`}
                    className="h-4 w-4"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <Card
                  className={cn(
                    "group relative cursor-pointer transition-all duration-200 hover:shadow-md flex-1",
                    isUnread ? "border-l-2 border-l-gold bg-gold/[0.03]" : "opacity-75 hover:opacity-100",
                    isChecked && "ring-1 ring-gold/40"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4 p-4">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", config.bg)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className={cn(
                          "text-sm truncate",
                          isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                        )}>
                          {notification.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 text-[10px] px-1.5 py-0", config.color, "border-current/20")}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                      <span className="mt-1 block text-xs text-muted-foreground/60">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {isUnread && (
                        <span className="flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-gold opacity-40" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
