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
import { EmptyInboxIllustration } from "@/components/illustrations";
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
  INFO: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  SUCCESS: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  WARNING: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  ERROR: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
} as const;

export function NotificationBell() {
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
    if (prevCountRef.current !== null && unreadCount > prevCountRef.current) {
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
  }, [unreadCount]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-[70vh] flex flex-col overflow-hidden" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead.mutate(undefined)}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Read all
              </Button>
            )}
            {(notifications?.length ?? 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => clearAll.mutate(undefined)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-hidden max-h-[60vh]">
          {!notifications?.length ? (
            <div className="py-6 px-4 text-center">
              <EmptyInboxIllustration className="mx-auto mb-2 h-20 w-20 opacity-90" />
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">When something important happens, it will show up here.</p>
            </div>
          ) : (
            <div className="divide-y">
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
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group/notif cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      !n.isRead && "bg-primary/5"
                    )}
                    onClick={openNotification}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openNotification();
                      }
                    }}
                  >
                    <div className={cn("mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0", config.bg)}>
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm line-clamp-1", !n.isRead && "font-medium")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {n.createdAt
                          ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0 ml-1">
                      {!n.isRead && (
                        <div className="h-2 w-2 rounded-full bg-gold" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteOne.mutate(n.id); }}
                        className="opacity-0 group-hover/notif:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500"
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
