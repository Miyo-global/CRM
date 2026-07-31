"use client";

import { useEffect } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { activeChannelIdRef } from "./active-channel-ref";

interface InboxPayload {
  channelId?: number;
  messageId?: number;
  senderId?: string;
}

export function useChatInboxRealtime(orgId: string | undefined): void {
  const queryClient = useQueryClient();
  const ably = useAbly();

  useEffect(() => {
    if (!orgId) return;

    const channelName = `chat:${orgId}:inbox`;
    const channel = ably.channels.get(channelName);

    const handler = (msg: InboundMessage) => {
      const payload = msg.data as InboxPayload;
      if (payload?.channelId != null && payload.channelId === activeChannelIdRef.current) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.unreadTotal() });
    };

    channel.subscribe("channel_message", handler);

    return () => {
      channel.unsubscribe("channel_message", handler);
    };
  }, [ably, orgId, queryClient]);
}
