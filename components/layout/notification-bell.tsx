"use client";

import { useEffect, useRef } from "react";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle, Trash2, X } from "lucide-react";
import { playAlertSound } from "@/lib/chat/sound-alerts";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toneSoft } from "@/lib/design/tones";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from "@/lib/api/hooks/notifications";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  INFO: { icon: Info, tone: toneSoft.info },
  SUCCESS: { icon: CheckCircle2, tone: toneSoft.success },
  WARNING: { icon: AlertTriangle, tone: toneSoft.warning },
  ERROR: { icon: XCircle, tone: toneSoft.danger },
} as const;

interface NotificationBellProps {
  /** "inverse" renders for ink surfaces (sidebar). */
  tone?: "default" | "inverse";
  /** Skip sound/desktop alerts — set on secondary instances so alerts fire once. */
  silent?: boolean;
}

export function NotificationBell({ tone = "default", silent = false }: NotificationBellProps = {}) {
  const { data: countData } = useUnreadNotificationCount({
    refetchInterval: 30000,
  });
  const { data: notifications } = useNotifications(false, 20, { refetchInterval: 30_000 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteOne = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const unreadCount = countData?.count || 0;

  const prevCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!silent && prevCountRef.current !== null && unreadCount > prevCountRef.current) {
      playAlertSound();
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.visibilityState !== "visible"
      ) {
        const n = new Notification("New notification", {
          body: "You have a new notification in the CRM.",
          icon: "/favicon.ico",
          tag: "app-notification",
        });
        n.onclick = () => { window.focus(); n.close(); };
        setTimeout(() => n.close(), 8_000);
      }
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount, silent]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "relative",
            tone === "inverse"
              ? "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-foreground data-[state=open]:bg-accent",
          )}
          aria-label="Notifications"
        >
          <Bell className="size-4" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-3xs font-bold tabular-nums ring-2",
                tone === "inverse"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground ring-sidebar"
                  : "bg-primary text-primary-foreground ring-background",
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-[70vh] flex flex-col overflow-hidden" align="end" side={tone === "inverse" ? "right" : "bottom"}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => markAllRead.mutate(undefined)}
              >
                <CheckCheck className="size-3.5" />
                Read all
              </Button>
            )}
            {(notifications?.length ?? 0) > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-destructive hover:bg-danger-soft hover:text-destructive"
                onClick={() => clearAll.mutate(undefined)}
              >
                <Trash2 className="size-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-hidden max-h-[60vh]">
          {!notifications?.length ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No notifications.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const config = TYPE_CONFIG[n.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.INFO;
                const Icon = config.icon;

                const openNotification = () => {
                  if (!n.isRead) markRead.mutate(n.id);
                  if (n.link && n.link.startsWith("/") && !n.link.startsWith("//")) {
                    window.location.href = n.link;
                  }
                };

                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/60 transition-colors group/notif cursor-pointer outline-none focus-visible:focus-ring",
                      !n.isRead && "bg-brand-soft/40"
                    )}
                    onClick={openNotification}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openNotification();
                      }
                    }}
                  >
                    <div className={cn("mt-0.5 size-7 rounded-full flex items-center justify-center shrink-0", config.tone)}>
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm line-clamp-1", !n.isRead && "font-medium")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-2xs text-muted-foreground mt-1">
                        {n.createdAt
                          ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0 ml-1">
                      {!n.isRead && (
                        <div className="size-1.5 rounded-full bg-primary" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteOne.mutate(n.id); }}
                        className="opacity-0 group-hover/notif:opacity-100 focus-visible:opacity-100 transition-opacity p-0.5 rounded-sm hover:bg-danger-soft text-muted-foreground hover:text-destructive focus-visible:focus-ring"
                        aria-label="Delete notification"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
