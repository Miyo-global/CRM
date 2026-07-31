"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  useChatChannel,
  useChatMessages,
  useChatPoll,
  useMarkRead,
  useSendMessage,
  useDeleteMessage,
  useEditMessage,
  useChatOnlineUsers,
  useSetTyping,
  useChatTyping,
  useChatOrgUsers,
  useToggleReaction,
} from "@/lib/hooks/trpc-hooks";
import { queryKeys } from "@/lib/query-keys";
import { useChatRealtime } from "@/lib/api/hooks/chat-realtime";
import { activeChannelIdRef } from "./active-channel-ref";
import { getInitials, getDateLabel, resolveFileUrl } from "./chat-helpers";
import type { Message } from "./chat-types";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";

export function MessagePanel({
  channelId,
  currentUserId,
  onBack,
  onToggleInfo,
  showInfoPanel,
  sidebarCollapsed,
  onExpandSidebar,
}: {
  channelId: number;
  currentUserId: string;
  onBack: () => void;
  onToggleInfo: () => void;
  showInfoPanel: boolean;
  sidebarCollapsed?: boolean;
  onExpandSidebar?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: channel } = useChatChannel(channelId);
  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(channelId);
  const markReadRef = useRef(useMarkRead());
  const markRead = markReadRef.current;
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const toggleReaction = useToggleReaction(channelId);
  const { data: onlineUsers } = useChatOnlineUsers();
  const setTyping = useSetTyping();
  const { data: typingUsers } = useChatTyping(channelId, channelId > 0);
  const lastTypingSent = useRef(0);

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const typingText = useMemo(() => {
    if (!typingUsers || typingUsers.length === 0) return null;
    const names = typingUsers.map((t: { name: string }) => t.name.split(" ")[0]);
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  }, [typingUsers]);

  const { isConnected: ablyConnected } = useChatRealtime(channelId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const didInitialScrollRef = useRef(false);
  const [messageInput, setMessageInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editInput, setEditInput] = useState("");
  const [lastPollTime, setLastPollTime] = useState<string>(() => "");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingAttachments, setPendingAttachments] = useState<
    { fileName: string; fileUrl: string; fileKey: string; fileSize: number; mimeType: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

  const { data: orgUsers } = useChatOrgUsers();
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const dmParticipantIds = useMemo(() => {
    if (channel?.type !== "DIRECT") return new Set<string>();
    return new Set(
      (channel.members ?? [])
        .map((m) => m.user?.id)
        .filter((id): id is string => Boolean(id) && id !== currentUserId)
    );
  }, [channel?.type, channel?.members, currentUserId]);

  const filteredMentions = useMemo(() => {
    let eligible: NonNullable<typeof orgUsers>;
    if (channel?.type === "DIRECT") {
      // Show DM participants; fall back to all org users while channel data loads
      eligible = dmParticipantIds.size > 0
        ? (orgUsers ?? []).filter((u) => dmParticipantIds.has(u.id))
        : (orgUsers ?? []);
    } else {
      // Groups/channels: show all org users (API already excludes current user)
      eligible = orgUsers ?? [];
    }
    if (!mentionQuery) return eligible;
    const q = mentionQuery.toLowerCase();
    return eligible.filter((u) => u.name?.toLowerCase().includes(q));
  }, [orgUsers, mentionQuery, channel?.type, dmParticipantIds]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const messages: Message[] = useMemo(() => {
    const all = (messagesData?.pages.flatMap((p) => p.messages) as Message[]) ?? [];
    const seen = new Set<number>();
    return all.filter((msg) => {
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }, [messagesData]);

  useEffect(() => {
    if (lastPollTime) return;
    if (messages.length > 0) {
      const newest = messages[messages.length - 1].createdAt;
      const iso = newest ? new Date(newest).toISOString() : new Date().toISOString();
      setLastPollTime(iso);
    }
  }, [lastPollTime, messages]);

  const { data: pollResponse } = useChatPoll(
    channelId,
    lastPollTime,
    !ablyConnected && messages.length > 0 && lastPollTime !== ""
  );

  useEffect(() => {
    if (pollResponse && pollResponse.messages && pollResponse.messages.length > 0) {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(channelId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.myChannels() });
      if (pollResponse.serverTime) setLastPollTime(pollResponse.serverTime);
      if (channelId > 0) markRead.mutate({ channelId });
    } else if (pollResponse && pollResponse.serverTime) {
      setLastPollTime(pollResponse.serverTime);
    }
  }, [pollResponse, channelId, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (channelId > 0) markRead.mutate({ channelId });
  }, [channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    activeChannelIdRef.current = channelId;
    return () => {
      activeChannelIdRef.current = null;
    };
  }, [channelId]);

  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [channelId]);

  useEffect(() => {
    if (isLoading || messages.length === 0) return;
    if (didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [channelId, isLoading, messages.length]);

  useEffect(() => {
    setLastPollTime("");
    setReplyTo(null);
    setMessageInput("");
    setEditingMessage(null);
    setPendingAttachments([]);
    setShowEmojiPicker(false);
    setShowMentions(false);
    inputRef.current?.focus();
  }, [channelId]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const MAX_SIZE = 10 * 1024 * 1024;
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE) { toast.error(`${file.name} is too large (max 10MB)`); continue; }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "chat");
        const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
        if (!res.ok) { const err = await res.json(); toast.error(`Failed: ${err.error || file.name}`); continue; }
        const result = await res.json();
        setPendingAttachments((prev) => [
          ...prev,
          { fileName: file.name, fileUrl: result.url, fileKey: result.key, fileSize: result.size ?? file.size, mimeType: result.mimeType ?? file.type },
        ]);
      }
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  }, []);

  const insertEmoji = useCallback((emoji: string) => {
    const el = inputRef.current;
    if (el) {
      const start = el.selectionStart ?? messageInput.length;
      const end = el.selectionEnd ?? messageInput.length;
      const newValue = messageInput.slice(0, start) + emoji + messageInput.slice(end);
      setMessageInput(newValue);
      setTimeout(() => { el.focus(); el.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
    } else {
      setMessageInput((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  }, [messageInput]);

  const insertMention = useCallback((name: string) => {
    const el = inputRef.current;
    if (!el) return;
    const text = messageInput;
    const cursorPos = el.selectionStart ?? text.length;
    const beforeCursor = text.slice(0, cursorPos);
    const atIdx = beforeCursor.lastIndexOf("@");
    if (atIdx === -1) return;
    const newValue = text.slice(0, atIdx) + `@${name} ` + text.slice(cursorPos);
    setMessageInput(newValue);
    setShowMentions(false);
    setMentionQuery("");
    setTimeout(() => { el.focus(); const pos = atIdx + name.length + 2; el.setSelectionRange(pos, pos); }, 0);
  }, [messageInput]);

  const handleSend = useCallback(async () => {
    if (editingMessage) return;
    const content = messageInput.trim();
    if (!content && pendingAttachments.length === 0) return;
    const replyId = replyTo?.id;
    const attachments = [...pendingAttachments];
    setMessageInput("");
    setReplyTo(null);
    setPendingAttachments([]);
    try {
      await sendMessage.mutateAsync({ channelId, content: content || undefined, replyToId: replyId, attachments: attachments.length > 0 ? attachments : undefined });
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      setMessageInput(content);
      setPendingAttachments(attachments);
      toast.error(getErrorMessage(error));
    }
  }, [messageInput, channelId, replyTo, sendMessage, pendingAttachments]);

  const handleEdit = useCallback(async (messageId: number) => {
    const content = editInput.trim();
    if (!content) return;
    try {
      await editMessage.mutateAsync({ channelId, messageId, content });
      setEditingMessage(null);
      setEditInput("");
    } catch (error) { toast.error(getErrorMessage(error)); }
  }, [editInput, editMessage, channelId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((prev) => (prev + 1) % filteredMentions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredMentions[mentionIndex].name ?? ""); return; }
      if (e.key === "Escape") { setShowMentions(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend, showMentions, filteredMentions, mentionIndex, insertMention]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
    if (value.trim() && Date.now() - lastTypingSent.current > 3000) {
      lastTypingSent.current = Date.now();
      setTyping.mutate({ channelId });
    }
    const cursorPos = el.selectionStart ?? value.length;
    const textBefore = value.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) { setShowMentions(true); setMentionQuery(atMatch[1]); setMentionIndex(0); }
    else { setShowMentions(false); setMentionQuery(""); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const otherMember =
    channel?.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;
  const displayName =
    channel?.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel?.name ?? "Chat";
  const memberCount = channel?.members?.length ?? 0;
  const isOtherOnline =
    channel?.type === "DIRECT" && otherMember ? onlineUserIds.has(otherMember.id) : false;

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    for (const msg of messages) {
      const d = msg.createdAt ? new Date(msg.createdAt) : new Date();
      const dateStr = getDateLabel(d);
      if (dateStr !== currentDate) { currentDate = dateStr; groups.push({ date: dateStr, messages: [] }); }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }, [messages]);

  return (
    <>

      <div className="h-[56px] px-4 border-b border-border/40 flex items-center gap-3 shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        {sidebarCollapsed && onExpandSidebar && (
          <button
            onClick={onExpandSidebar}
            className="hidden md:flex p-1.5 -ml-1 hover:bg-muted/50 rounded-lg"
            aria-label="Open conversations"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
              <path d="m14 9 3 3-3 3" />
            </svg>
          </button>
        )}
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 hover:bg-muted/50 rounded-lg"
          aria-label="Back to channels"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          {channel?.type === "DIRECT" ? (
            <div className="relative">
              <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-gold/20 to-gold/5 text-gold">
                  {getInitials(otherMember?.name)}
                </AvatarFallback>
              </Avatar>
              {isOtherOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
              )}
            </div>
          ) : channel?.avatarUrl ? (
            <div className="relative h-9 w-9 rounded-xl overflow-hidden border border-border/30 shadow-sm">
              <Image
                src={resolveFileUrl(channel.avatarUrl)}
                alt={displayName}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border border-blue/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue">
                <line x1="4" x2="20" y1="9" y2="9" />
                <line x1="4" x2="20" y1="15" y2="15" />
                <line x1="10" x2="8" y1="3" y2="21" />
                <line x1="16" x2="14" y1="3" y2="21" />
              </svg>
            </div>
          )}

          <div className="min-w-0">
            <h3 className="text-[15px] font-bold truncate leading-tight">{displayName}</h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {channel?.type === "DIRECT" ? (
                isOtherOnline ? (
                  <span className="text-emerald-500 font-medium">Online</span>
                ) : (
                  "Offline"
                )
              ) : (
                `${memberCount} members`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {channel?.type === "GROUP" && (
            <div className="hidden sm:flex -space-x-1.5 mr-2">
              {channel.members?.slice(0, 3).map((m) => (
                <Avatar key={m.user?.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={resolveImageUrl(m.user?.image)} />
                  <AvatarFallback className="text-[8px]">{getInitials(m.user?.name)}</AvatarFallback>
                </Avatar>
              ))}
              {memberCount > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-semibold text-muted-foreground">
                  +{memberCount - 3}
                </div>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-lg", showInfoPanel && "bg-muted")}
            onClick={onToggleInfo}
            aria-label="Toggle member info"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </Button>
        </div>
      </div>

      <MessageList
        groupedMessages={groupedMessages}
        messages={messages}
        isLoading={isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        currentUserId={currentUserId}
        channelId={channelId}
        displayName={displayName}
        channelType={channel?.type}
        editingMessage={editingMessage}
        editInput={editInput}
        onEditInputChange={setEditInput}
        onStartEdit={(msg) => {
          const created = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
          const windowMs =
            Number(process.env.NEXT_PUBLIC_CHAT_MESSAGE_EDIT_WINDOW_MS) ||
            3_600_000;
          if (Date.now() - created > windowMs) {
            toast.error("This message can no longer be edited.");
            return;
          }
          setEditingMessage(msg);
          setEditInput(msg.content ?? "");
        }}
        onCancelEdit={() => { setEditingMessage(null); setEditInput(""); }}
        onSaveEdit={handleEdit}
        onReply={(msg) => { if (editingMessage) return; setReplyTo(msg); inputRef.current?.focus(); }}
        onDelete={(messageId) => deleteMessage.mutate({ channelId, messageId })}
        onReact={(messageId, emoji) => { if (!editingMessage) toggleReaction.mutate({ messageId, emoji }); }}
        showScrollBtn={showScrollBtn}
        scrollToBottom={scrollToBottom}
        messagesEndRef={messagesEndRef}
        scrollContainerRef={scrollContainerRef}
        onScroll={handleScroll}
      />

      <MessageInput
        channelId={channelId}
        displayName={displayName}
        channelType={channel?.type}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        editingMessage={editingMessage}
        onCancelEdit={() => { setEditingMessage(null); setEditInput(""); }}
        pendingAttachments={pendingAttachments}
        setPendingAttachments={setPendingAttachments}
        uploading={uploading}
        onFileSelect={handleFileSelect}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        emojiRef={emojiRef}
        insertEmoji={insertEmoji}
        showMentions={showMentions}
        setShowMentions={setShowMentions}
        mentionQuery={mentionQuery}
        mentionIndex={mentionIndex}
        setMentionIndex={setMentionIndex}
        filteredMentions={filteredMentions}
        insertMention={insertMention}
        typingText={typingText}
        sendMessage={sendMessage}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        onInputChange={handleInputChange}
      />
    </>
  );
}
