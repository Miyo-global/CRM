"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  useChatChannels,
  useChatOrgUsers,
  useChatOnlineUsers,
  useCreateDM,
  useSendMessage,
} from "@/lib/hooks/trpc-hooks";
import { resolveImageUrl, cn } from "@/lib/utils";
import { getInitials } from "./chat-helpers";
import type { Message, Channel } from "./chat-types";

const FORWARD_PREFIX = "Forwarded";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ForwardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 17 20 12 15 7" />
      <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

type ForwardTarget =
  | { kind: "channel"; key: string; channelId: number; label: string; type: "DIRECT" | "GROUP"; image: string | null; userId?: string; isOnline?: boolean }
  | { kind: "user"; key: string; userId: string; label: string; subtitle: string | null; image: string | null; isOnline: boolean };

function buildForwardContent(message: Message): string | undefined {
  const lines: string[] = [];
  if (message.content?.trim()) {
    lines.push(message.content.trim());
  }
  if (message.attachments.length > 0) {
    const names = message.attachments.map((a) => a.fileName).join(", ");
    lines.push(`(Attachment: ${names})`);
  }
  if (lines.length === 0) return undefined;
  return `${FORWARD_PREFIX}\n${lines.join("\n")}`;
}

function TargetRow({
  target,
  selected,
  disabled,
  onToggle,
}: {
  target: ForwardTarget;
  selected: boolean;
  disabled: boolean;
  onToggle: (key: string) => void;
}) {
  const handleClick = useCallback(() => onToggle(target.key), [target.key, onToggle]);
  const isGroup = target.kind === "channel" && target.type === "GROUP";
  const isOnline = target.kind === "user" ? target.isOnline : target.isOnline ?? false;
  const subtitle =
    target.kind === "user"
      ? target.subtitle
      : target.type === "GROUP"
      ? "Group channel"
      : "Direct message";
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
        selected ? "bg-gold/10" : "hover:bg-muted/40",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="relative shrink-0">
        {isGroup ? (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border border-blue/10 text-blue">
            <HashIcon className="h-4 w-4" />
          </div>
        ) : (
          <Avatar className="h-9 w-9">
            <AvatarImage src={resolveImageUrl(target.image)} />
            <AvatarFallback className="text-[10px] font-medium">{getInitials(target.label)}</AvatarFallback>
          </Avatar>
        )}
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{target.label}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <span
        className={cn(
          "h-5 w-5 rounded-md border shrink-0 flex items-center justify-center transition-colors",
          selected ? "bg-gold border-gold text-white" : "border-border/60 text-transparent"
        )}
      >
        <CheckIcon className="h-3 w-3" />
      </span>
    </button>
  );
}

export function ForwardMessageDialog({
  open,
  onOpenChange,
  message,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message;
  currentUserId: string;
}) {
  const { data: channels } = useChatChannels(open);
  const { data: orgUsers } = useChatOrgUsers(open);
  const { data: onlineUsers } = useChatOnlineUsers(open);
  const createDM = useCreateDM();
  const sendMessage = useSendMessage();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const onlineUserIds = useMemo(
    () => new Set(onlineUsers?.map((u: { userId: string }) => u.userId) ?? []),
    [onlineUsers]
  );

  const targets = useMemo<ForwardTarget[]>(() => {
    const list: ForwardTarget[] = [];
    const dmUserIds = new Set<string>();

    for (const channel of (channels ?? []) as Channel[]) {
      if (channel.isArchived) continue;
      if (channel.type === "DIRECT") {
        const other = channel.members?.find((m) => m.user?.id !== currentUserId)?.user;
        if (other?.id) dmUserIds.add(other.id);
        list.push({
          kind: "channel",
          key: `channel:${channel.id}`,
          channelId: channel.id,
          label: other?.name ?? "Unknown",
          type: "DIRECT",
          image: other?.image ?? null,
          userId: other?.id,
          isOnline: other?.id ? onlineUserIds.has(other.id) : false,
        });
      } else {
        list.push({
          kind: "channel",
          key: `channel:${channel.id}`,
          channelId: channel.id,
          label: channel.name,
          type: "GROUP",
          image: channel.avatarUrl ?? null,
        });
      }
    }

    for (const user of orgUsers ?? []) {
      if (user.id === currentUserId) continue;
      if (dmUserIds.has(user.id)) continue;
      list.push({
        kind: "user",
        key: `user:${user.id}`,
        userId: user.id,
        label: user.name ?? user.email ?? "Member",
        subtitle: user.email ?? null,
        image: user.image ?? null,
        isOnline: onlineUserIds.has(user.id),
      });
    }

    return list;
  }, [channels, orgUsers, currentUserId, onlineUserIds]);

  const filteredTargets = useMemo(() => {
    if (!search.trim()) return targets;
    const q = search.toLowerCase();
    return targets.filter((t) => {
      if (t.label.toLowerCase().includes(q)) return true;
      if (t.kind === "user" && t.subtitle?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [targets, search]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    []
  );

  const handleToggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSearch("");
    setSelected(new Set());
    setSubmitting(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset]
  );

  const handleForward = useCallback(async () => {
    const content = buildForwardContent(message);
    if (!content) {
      toast.error("Nothing to forward");
      return;
    }
    const chosen = targets.filter((t) => selected.has(t.key));
    if (chosen.length === 0) return;

    setSubmitting(true);
    let sent = 0;
    let failed = 0;

    for (const target of chosen) {
      try {
        let channelId: number;
        if (target.kind === "channel") {
          channelId = target.channelId;
        } else {
          const channel = await createDM.mutateAsync({ targetUserId: target.userId });
          channelId = channel.id;
        }
        await sendMessage.mutateAsync({ channelId, content });
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    setSubmitting(false);

    if (sent > 0) {
      toast.success(
        sent === 1 ? "Message forwarded" : `Forwarded to ${sent} conversations`
      );
    }
    if (failed > 0) {
      toast.error(
        failed === 1
          ? "Failed to forward to 1 conversation"
          : `Failed to forward to ${failed} conversations`
      );
    }
    if (sent > 0) {
      handleOpenChange(false);
    }
  }, [message, targets, selected, createDM, sendMessage, handleOpenChange]);

  const selectedCount = selected.size;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle className="text-[16px] flex items-center gap-2">
            <ForwardIcon className="h-4 w-4 text-gold" />
            Forward message
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-3 space-y-2.5">
          {(message.content?.trim() || message.attachments.length > 0) && (
            <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
              {message.content?.trim() ? (
                <p className="text-[12px] text-foreground/80 line-clamp-3 whitespace-pre-wrap break-words">
                  {message.content.trim()}
                </p>
              ) : null}
              {message.attachments.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {message.attachments.length === 1
                    ? message.attachments[0].fileName
                    : `${message.attachments.length} attachments`}
                </p>
              )}
            </div>
          )}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              placeholder="Search people or channels..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 h-9 bg-muted/30 border-border/30"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="h-[300px] border-t border-border/30">
          <div className="p-1">
            {filteredTargets.map((target) => (
              <TargetRow
                key={target.key}
                target={target}
                selected={selected.has(target.key)}
                disabled={submitting}
                onToggle={handleToggle}
              />
            ))}
            {filteredTargets.length === 0 && (
              <div className="text-center py-10">
                <p className="text-[13px] text-muted-foreground">No conversations found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-4 py-3 border-t border-border/30 sm:justify-between gap-2">
          <span className="text-[12px] text-muted-foreground self-center">
            {selectedCount > 0 ? `${selectedCount} selected` : "Select a destination"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
              className="h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleForward}
              disabled={submitting || selectedCount === 0}
              className="h-8"
            >
              {submitting ? "Forwarding..." : "Forward"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
