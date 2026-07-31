"use client";

import { useEffect, useRef } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { activeChannelIdRef } from "@/features/chat/active-channel-ref";
import type { Channel } from "@/types/chat";
import { initSoundAlerts, playMessageSound } from "@/lib/chat/sound-alerts";

interface NotificationPayload {
  id?: number;
  senderId?: string;
  senderName?: string | null;
  content?: string | null;
}

export function useChatGlobalNotifications(
  channels: Channel[] | undefined,
  activeChannelId: number | null,
  currentUserId: string | undefined
) {
  const ably = useAbly();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const orgId = session?.orgId;

  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    initSoundAlerts();
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!orgId || !channels?.length) return;

    const subs: Array<{
      ch: ReturnType<typeof ably.channels.get>;
      h: (msg: InboundMessage) => void;
    }> = [];

    for (const channel of channels) {
      const ablyChannel = ably.channels.get(`chat:${orgId}:${channel.id}`);
      const channelId = channel.id;
      const channelType = channel.type;
      const channelDisplayName = channel.name;

      const handler = (msg: InboundMessage) => {
        const payload = msg.data as NotificationPayload;
        if (!payload?.id || payload.senderId === currentUserIdRef.current) return;

        if (channelId !== activeChannelIdRef.current) {
          queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
          queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
        }

        if (channelId === activeChannelIdRef.current) return;

        const senderName = payload.senderName ?? "Someone";
        const title =
          channelType === "DIRECT"
            ? senderName
            : `#${channelDisplayName ?? "channel"}`;
        const body = payload.content?.slice(0, 80) ?? "Sent an attachment";

        playMessageSound();

        toast(title, { description: body, duration: 5_000 });

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted" &&
          document.visibilityState !== "visible"
        ) {
          const n = new Notification(title, {
            body,
            icon: "/favicon.ico",
            tag: `chat-channel-${channelId}`,
            requireInteraction: false,
          });
          n.onclick = () => {
            window.focus();
            window.location.href = `/chat?channel=${channelId}`;
            n.close();
          };
          setTimeout(() => n.close(), 8_000);
        }
      };

      ablyChannel.subscribe("message", handler);
      subs.push({ ch: ablyChannel, h: handler });
    }

    return () => {
      for (const { ch, h } of subs) {
        ch.unsubscribe("message", h);
      }
    };
  }, [orgId, channels, ably, queryClient]);
}
