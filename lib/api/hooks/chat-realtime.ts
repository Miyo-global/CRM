"use client";

import { useEffect, useState } from "react";
import { useAbly } from "ably/react";
import type { InboundMessage } from "ably";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { queryKeys } from "@/lib/query-keys";
import { activeChannelIdRef } from "@/features/chat/active-channel-ref";
import type { Channel, Message, MessagesPage } from "@/types/chat";
import type { InfiniteData } from "@tanstack/react-query";

interface AblyMessagePayload {
  id: number;
  channelId: number;
  senderId: string;
  senderName?: string | null;
  content: string | null;
  createdAt: string | null;
  replyToId: number | null;
}

function payloadToMessage(payload: AblyMessagePayload): Message {
  return {
    id: payload.id,
    channelId: payload.channelId,
    senderId: payload.senderId,
    content: payload.content,
    replyToId: payload.replyToId ?? null,
    isEdited: false,
    isDeleted: false,
    messageType: "text",
    metadata: null,
    actionStatus: null,
    createdAt: payload.createdAt,
    updatedAt: payload.createdAt,
    sender: payload.senderId
      ? { id: payload.senderId, name: payload.senderName ?? null, image: null }
      : null,
    attachments: [],
    replyTo: null,
    reactions: {},
  };
}

export function useChatRealtime(channelId: number | null): { isConnected: boolean } {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const ably = useAbly();
  const orgId = session?.orgId;

  const [isConnected, setIsConnected] = useState(
    () => ably.connection.state === "connected"
  );

  useEffect(() => {
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    ably.connection.on("connected", handleConnected);
    ably.connection.on("disconnected", handleDisconnected);
    ably.connection.on("failed", handleDisconnected);
    ably.connection.on("suspended", handleDisconnected);

    setIsConnected(ably.connection.state === "connected");

    return () => {
      ably.connection.off("connected", handleConnected);
      ably.connection.off("disconnected", handleDisconnected);
      ably.connection.off("failed", handleDisconnected);
      ably.connection.off("suspended", handleDisconnected);
    };
  }, [ably]);

  useEffect(() => {
    if (!orgId || !channelId || channelId <= 0) return;

    const channelName = `chat:${orgId}:${channelId}`;
    const channel = ably.channels.get(channelName);

    const handler = (msg: InboundMessage) => {
      const payload = msg.data as AblyMessagePayload;
      if (!payload?.id) return;

      const cacheKey = queryKeys.chat.messages(channelId);

      queryClient.setQueryData<InfiniteData<MessagesPage>>(cacheKey, (old) => {
        if (!old) return old;

        const allExisting = old.pages.flatMap((p) => p.messages);
        if (allExisting.some((m) => m.id === payload.id)) return old;

        const newMessage = payloadToMessage(payload);

        const updatedPages = old.pages.map((page, idx) => {
          if (idx !== old.pages.length - 1) return page;
          return { ...page, messages: [...page.messages, newMessage] };
        });

        return { ...old, pages: updatedPages };
      });

      // Invalidate messages to fetch complete data (sender image, replyTo, attachments)
      queryClient.invalidateQueries({ queryKey: cacheKey });

      // Update sidebar directly: set lastMessage and clear unread for active channel
      queryClient.setQueryData<Channel[]>(queryKeys.chat.myChannels(), (channels) => {
        if (!channels) return channels;
        return channels.map((ch) => {
          if (ch.id !== channelId) return ch;
          const isActive = channelId === activeChannelIdRef.current;
          return {
            ...ch,
            lastMessage: {
              content: payload.content,
              senderName: payload.senderName ?? null,
              createdAt: payload.createdAt,
            },
            unreadCount: isActive ? 0 : (ch.unreadCount ?? 0) + 1,
          };
        });
      });

      // Keep unreadTotal in sync for non-active channels
      if (channelId !== activeChannelIdRef.current) {
        queryClient.setQueryData<{ total: number }>(queryKeys.chat.unreadTotal(), (data) => {
          if (!data) return data;
          return { total: data.total + 1 };
        });
      }

      fetch(`/api/chat/channels/${channelId}/read`, { method: "POST", credentials: "include" }).catch(() => {});
    };

    const reactionHandler = (msg: InboundMessage) => {
      const payload = msg.data as {
        channelId: number;
        messageId: number;
        reactions: Record<string, string[]>;
      };
      if (!payload?.messageId) return;

      const cacheKey = queryKeys.chat.messages(channelId);

      queryClient.setQueryData<InfiniteData<MessagesPage>>(cacheKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m.id === payload.messageId
                ? { ...m, reactions: payload.reactions }
                : m
            ),
          })),
        };
      });
    };

    const deletedHandler = (msg: InboundMessage) => {
      const payload = msg.data as { messageId: number };
      if (!payload?.messageId) return;
      const cacheKey = queryKeys.chat.messages(channelId);
      queryClient.setQueryData<InfiniteData<MessagesPage>>(cacheKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m.id === payload.messageId
                ? { ...m, isDeleted: true, content: null }
                : m.replyToId === payload.messageId && m.replyTo
                ? { ...m, replyTo: { ...m.replyTo, isDeleted: true, content: null } }
                : m
            ),
          })),
        };
      });
    };

    const editedHandler = (msg: InboundMessage) => {
      const payload = msg.data as { messageId: number; content: string };
      if (!payload?.messageId) return;
      const cacheKey = queryKeys.chat.messages(channelId);
      queryClient.setQueryData<InfiniteData<MessagesPage>>(cacheKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m.id === payload.messageId
                ? { ...m, content: payload.content, isEdited: true }
                : m
            ),
          })),
        };
      });
    };

    channel.subscribe("message", handler);
    channel.subscribe("reaction-updated", reactionHandler);
    channel.subscribe("message-deleted", deletedHandler);
    channel.subscribe("message-edited", editedHandler);

    return () => {
      channel.unsubscribe("message", handler);
      channel.unsubscribe("reaction-updated", reactionHandler);
      channel.unsubscribe("message-deleted", deletedHandler);
      channel.unsubscribe("message-edited", editedHandler);
    };
  }, [ably, channelId, orgId, queryClient]);

  return { isConnected };
}
