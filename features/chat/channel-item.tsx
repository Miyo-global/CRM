"use client";

import { useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
const HashIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
);
const MoreHorizontalIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
);
const LogOutIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);
const PinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
);
const Trash2Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
);
import Image from "next/image";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials, formatChannelTime, resolveFileUrl } from "./chat-helpers";
import type { Channel } from "./chat-types";

export function ChannelItem({
  channel,
  isActive,
  onClick,
  currentUserId,
  onlineUserIds,
  onLeave,
  onDelete,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
  onlineUserIds: Set<string>;
  onLeave?: (channelId: number) => void;
  onDelete?: (channelId: number) => void;
}) {
  const otherMember =
    channel.type === "DIRECT"
      ? channel.members?.find((m) => m.user?.id !== currentUserId)?.user
      : null;

  const displayName =
    channel.type === "DIRECT" ? otherMember?.name ?? "Unknown" : channel.name;

  const isOnline =
    channel.type === "DIRECT" && otherMember
      ? onlineUserIds.has(otherMember.id)
      : false;

  const hasUnread = channel.unreadCount > 0;

  const pinActive = Boolean(channel.isPinned && channel.pinnedUntil);

  const isAdmin = Boolean(
    channel.members?.some(
      (m) => m.user?.id === currentUserId && m.role === "ADMIN"
    )
  );

  const handleLeave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onLeave?.(channel.id);
    },
    [channel.id, onLeave]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(channel.id);
    },
    [channel.id, onDelete]
  );

  return (
    <div
      className={cn(
        "group/channel w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-100",
        isActive ? "bg-gold/10 shadow-sm" : "hover:bg-muted/40",
        hasUnread && !isActive && "text-foreground"
      )}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
      >
        <div className="relative shrink-0">
          {channel.type === "DIRECT" ? (
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarImage src={resolveImageUrl(otherMember?.image)} />
              <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-gold/20 to-gold/5 text-gold">
                {getInitials(otherMember?.name)}
              </AvatarFallback>
            </Avatar>
          ) : channel.avatarUrl ? (
            <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-background shadow-sm">
              <Image
                src={resolveFileUrl(channel.avatarUrl)}
                alt={channel.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border-2 border-background shadow-sm">
              <HashIcon className="h-4 w-4 text-blue" />
            </div>
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <p
              className={cn(
                "text-[13px] truncate leading-tight flex items-center gap-1 min-w-0",
                hasUnread || isActive ? "font-bold text-foreground" : "font-medium text-muted-foreground"
              )}
            >
              {pinActive ? (
                <PinIcon className="h-3 w-3 text-gold shrink-0" aria-hidden />
              ) : null}
              <span className="truncate">{displayName}</span>
            </p>
            {channel.lastMessage?.createdAt && (
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatChannelTime(channel.lastMessage.createdAt)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-0.5">
            <p className="text-[11px] text-muted-foreground/60 truncate leading-tight">
              {channel.lastMessage?.content
                ? `${channel.type === "GROUP" ? `${channel.lastMessage.senderName?.split(" ")[0]}: ` : ""}${channel.lastMessage.content}`
                : "No messages yet"}
            </p>
            {hasUnread && (
              <span className="h-[18px] min-w-[18px] flex items-center justify-center bg-gold text-white text-[10px] font-bold rounded-full px-1 shrink-0">
                {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>

      {onLeave && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-0 group-hover/channel:opacity-100 shrink-0 p-1 rounded-md hover:bg-muted/60 text-muted-foreground transition-opacity"
              aria-label="Channel options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontalIcon className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {channel.type === "DIRECT" ? (
              <DropdownMenuItem
                onClick={handleLeave}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2Icon className="mr-2 h-4 w-4" />
                Delete Conversation
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={handleLeave}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Leave Group
                </DropdownMenuItem>
                {isAdmin && onDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2Icon className="mr-2 h-4 w-4" />
                    Delete Group
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
