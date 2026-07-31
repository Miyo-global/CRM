"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
const MessageSquareTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/></svg>
);
const PanelLeftCloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>
);
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
import { EmptyMailIllustration } from "@/components/illustrations";
import { useChatChannels, useChatOnlineUsers } from "@/lib/hooks/trpc-hooks";
import { useLeaveChannel, useDeleteChannel } from "@/lib/api/hooks/chat";
import type { Channel } from "./chat-types";
import { ChannelSidebarSection } from "./channel-sidebar-section";
import { ChannelItem } from "./channel-item";
import { NewDMDialog } from "./new-dm-dialog";
import { NewGroupDialog } from "./new-group-dialog";
import { toast } from "sonner";

interface ChannelListEntryProps {
  channel: Channel;
  activeChannelId: number | null;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onSelectChannel: (id: number) => void;
  onLeave: (channelId: number) => void;
  onDelete?: (channelId: number) => void;
}

function ChannelListEntry({ channel: ch, activeChannelId, currentUserId, onlineUserIds, onSelectChannel, onLeave, onDelete }: ChannelListEntryProps) {
  const handleClick = useCallback(() => onSelectChannel(ch.id), [ch.id, onSelectChannel]);
  return (
    <ChannelItem
      channel={ch}
      isActive={activeChannelId === ch.id}
      onClick={handleClick}
      currentUserId={currentUserId}
      onlineUserIds={onlineUserIds}
      onLeave={onLeave}
      onDelete={onDelete}
    />
  );
}

export function ChannelSidebar({
  activeChannelId,
  onSelectChannel,
  onChannelLeft,
  currentUserId,
  autoFocusSearch,
  onSearchFocused,
  onCollapse,
}: {
  activeChannelId: number | null;
  onSelectChannel: (id: number) => void;
  onChannelLeft?: (channelId: number) => void;
  currentUserId: string;
  autoFocusSearch?: boolean;
  onSearchFocused?: () => void;
  onCollapse?: () => void;
}) {
  const { data: rawChannels, isLoading } = useChatChannels();
  const leaveChannel = useLeaveChannel();
  const deleteChannel = useDeleteChannel();
  const channels = rawChannels as Channel[] | undefined;
  const { data: onlineUsers } = useChatOnlineUsers();
  const [search, setSearch] = useState("");
  const [newDMOpen, setNewDMOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [dmsCollapsed, setDmsCollapsed] = useState(false);
  const [groupsCollapsed, setGroupsCollapsed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
  const handleClearSearch = useCallback(() => setSearch(""), []);
  const handleToggleGroups = useCallback(() => setGroupsCollapsed((p) => !p), []);
  const handleToggleDMs = useCallback(() => setDmsCollapsed((p) => !p), []);

  const handleLeave = useCallback((channelId: number) => {
    leaveChannel.mutate(channelId, {
      onSuccess: () => {
        toast.success("Left conversation");
        onChannelLeft?.(channelId);
      },
      onError: () => toast.error("Failed to leave conversation"),
    });
  }, [leaveChannel, onChannelLeft]);

  const handleDelete = useCallback((channelId: number) => {
    const ok = typeof window !== "undefined"
      ? window.confirm("Delete this group for everyone? This cannot be undone.")
      : true;
    if (!ok) return;
    deleteChannel.mutate(channelId, {
      onSuccess: () => {
        toast.success("Group deleted");
        onChannelLeft?.(channelId);
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Failed to delete group";
        toast.error(message);
      },
    });
  }, [deleteChannel, onChannelLeft]);

  useEffect(() => {
    if (autoFocusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
      onSearchFocused?.();
    }
  }, [autoFocusSearch, onSearchFocused]);

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    if (!search) return channels;
    const q = search.toLowerCase();
    return channels.filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        ch.lastMessage?.content?.toLowerCase().includes(q)
    );
  }, [channels, search]);

  const dms = useMemo(
    () => filteredChannels.filter((c) => c.type === "DIRECT"),
    [filteredChannels]
  );
  const groups = useMemo(
    () => filteredChannels.filter((c) => c.type === "GROUP"),
    [filteredChannels]
  );

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gold flex items-center justify-center shadow-sm">
              <MessageSquareTextIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Messages</h2>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {onlineUsers?.length ?? 0} online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <NewDMDialog open={newDMOpen} onOpenChange={setNewDMOpen} onCreated={onSelectChannel} />
            <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} onCreated={onSelectChannel} />
            {onCollapse && (
              <button
                onClick={onCollapse}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close sidebar"
              >
                <PanelLeftCloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            ref={searchInputRef}
            placeholder="Search conversations..."
            value={search}
            onChange={handleSearchChange}
            className="pl-8 h-8 text-[13px] bg-muted/30 border-border/30 rounded-lg placeholder:text-muted-foreground/40"
          />
          {search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
              aria-label="Clear search"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-2 py-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-1">
            {groups.length > 0 && (
              <ChannelSidebarSection
                title="Channels"
                count={groups.reduce((a, c) => a + c.unreadCount, 0)}
                collapsed={groupsCollapsed}
                onToggle={handleToggleGroups}
              >
                {groups.map((ch) => (
                  <ChannelListEntry
                    key={ch.id}
                    channel={ch}
                    activeChannelId={activeChannelId}
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
                    onSelectChannel={onSelectChannel}
                    onLeave={handleLeave}
                    onDelete={handleDelete}
                  />
                ))}
              </ChannelSidebarSection>
            )}

            {dms.length > 0 && (
              <ChannelSidebarSection
                title="Direct Messages"
                count={dms.reduce((a, c) => a + c.unreadCount, 0)}
                collapsed={dmsCollapsed}
                onToggle={handleToggleDMs}
              >
                {dms.map((ch) => (
                  <ChannelListEntry
                    key={ch.id}
                    channel={ch}
                    activeChannelId={activeChannelId}
                    currentUserId={currentUserId}
                    onlineUserIds={onlineUserIds}
                    onSelectChannel={onSelectChannel}
                    onLeave={handleLeave}
                  />
                ))}
              </ChannelSidebarSection>
            )}

            {filteredChannels.length === 0 && (
              <div className="text-center py-10 px-4">
                <EmptyMailIllustration className="mx-auto mb-4 w-32 h-32" />
                <p className="text-[13px] text-muted-foreground font-medium">
                  {search ? "No results found" : "No conversations yet"}
                </p>
                <p className="text-[11px] text-muted-foreground/50 mt-1">
                  {search ? "Try a different search" : "Start a new conversation"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
