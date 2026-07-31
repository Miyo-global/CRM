"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMessageReaders, useChatOrgUsers } from "@/lib/api/hooks/chat";
import {
  getInitials,
  formatMessageTime,
  formatMessageTimeFull,
  formatFileSize,
  getFileExt,
  getFileColor,
  isImageMime,
  resolveFileUrl,
  isOfficeLikeFileName,
  getAttachmentDownloadHref,
  fetchSignedFileUrlForOpen,
} from "./chat-helpers";
import { EmojiGrid } from "./emoji-grid";
import { ForwardMessageDialog } from "./forward-message-dialog";
import type { Message } from "./chat-types";

function MessageReadReceipts({
  channelId,
  messageId,
}: {
  channelId: number;
  messageId: number;
}) {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useMessageReaders(channelId, messageId, open);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-white/75 hover:text-white mt-0.5"
          aria-label="Read receipts"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Seen
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 text-xs" align="end">
        {isFetching ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : data?.readerNames?.length ? (
          <p className="text-foreground">
            <span className="text-muted-foreground">Read by: </span>
            {data.readerNames.join(", ")}
          </p>
        ) : (
          <p className="text-muted-foreground">No other members have read this yet.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ReactionWithWho({
  emoji,
  userIds,
  reactedByMe,
  currentUserId,
  isOwnBubble,
  profiles,
  onToggle,
}: {
  emoji: string;
  userIds: string[];
  reactedByMe: boolean;
  currentUserId: string;
  isOwnBubble: boolean;
  profiles: Map<string, { name: string; image: string | null }>;
  onToggle: () => void;
}) {
  const [whoOpen, setWhoOpen] = useState(false);

  const resolved = useMemo(() => {
    const rows = userIds.map((id) => {
      const p = profiles.get(id);
      return {
        id,
        label: p?.name ?? "Member",
        image: p?.image ?? null,
        isMe: id === currentUserId,
      };
    });
    rows.sort((a, b) => {
      if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
      return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
    return rows;
  }, [userIds, profiles, currentUserId]);

  const shellClass = cn(
    "inline-flex items-stretch h-6 rounded-full border text-[11px] transition-colors overflow-hidden",
    reactedByMe
      ? "bg-gold/10 border-gold/40 text-foreground"
      : "bg-background border-border/60 text-muted-foreground hover:bg-muted/40"
  );

  return (
    <div className={shellClass}>
      <button
        type="button"
        title={reactedByMe ? "Remove your reaction" : "React with this emoji"}
        aria-label={reactedByMe ? "Remove reaction" : "Add reaction"}
        onClick={onToggle}
        className="inline-flex items-center gap-0.5 pl-1.5 pr-1 shrink-0 hover:bg-black/5 dark:hover:bg-white/5"
      >
        <span className="text-[13px] leading-none">{emoji}</span>
      </button>
      <Popover open={whoOpen} onOpenChange={setWhoOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Who reacted"
            aria-label={`Who reacted: ${userIds.length}`}
            className={cn(
              "inline-flex items-center gap-0.5 min-w-[1.25rem] px-1.5 border-l font-semibold tabular-nums hover:bg-black/5 dark:hover:bg-white/5",
              isOwnBubble ? "border-white/20" : "border-border/50"
            )}
          >
            <svg className="h-2.5 w-2.5 opacity-70 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {userIds.length}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 text-xs" align={isOwnBubble ? "end" : "start"}>
          <div className="px-3 py-2 border-b border-border/50 font-medium text-foreground flex items-center gap-1.5">
            <span className="text-base leading-none">{emoji}</span>
            <span>Reactions ({userIds.length})</span>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1.5">
            {resolved.map(({ id, label, image, isMe }) => (
              <li
                key={id}
                className="px-3 py-1.5 flex items-center gap-2 text-foreground"
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={resolveImageUrl(image)} />
                  <AvatarFallback className="text-[9px] bg-muted">
                    {getInitials(label)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {label}
                  {isMe ? (
                    <span className="text-muted-foreground font-normal"> (you)</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ChatBubble({
  message,
  isOwn,
  showSender,
  isEditing,
  editInput,
  currentUserId,
  channelId,
  onEditInputChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onDelete,
  onReact,
}: {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
  isEditing: boolean;
  editInput: string;
  currentUserId: string;
  channelId: number;
  onEditInputChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onReply: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const { data: orgUsers } = useChatOrgUsers(channelId > 0);

  const reactionProfiles = useMemo(() => {
    const map = new Map<string, { name: string; image: string | null }>();
    for (const u of orgUsers ?? []) {
      const name =
        (u.name && u.name.trim()) ||
        (u.email && u.email.split("@")[0]) ||
        "Member";
      map.set(u.id, { name, image: u.image ?? null });
    }
    if (message.sender?.id) {
      const name = message.sender.name?.trim() || "Member";
      map.set(message.sender.id, {
        name,
        image: message.sender.image ?? null,
      });
    }
    return map;
  }, [orgUsers, message.sender]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      onReact(emoji);
      setMenuOpen(false);
    },
    [onReact]
  );
  const reactionEntries = Object.entries(message.reactions ?? {}).filter(
    ([, ids]) => ids.length > 0
  );
  const handleEditInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => onEditInputChange(e.target.value), [onEditInputChange]);
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(); }
    if (e.key === "Escape") onCancelEdit();
  }, [onSaveEdit, onCancelEdit]);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content!);
    toast.success("Copied");
  }, [message.content]);

  const handleOpenOfficeFile = useCallback(async (fileUrl: string, mimeType: string) => {
    try {
      const signed = await fetchSignedFileUrlForOpen(fileUrl, mimeType);
      if (signed) {
        window.open(signed, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Could not open file");
      }
    } catch {
      toast.error("Could not open file");
    }
  }, []);

  if (message.isDeleted) {
    return (
      <div className={cn("flex mb-[2px]", isOwn ? "justify-end" : "justify-start", !isOwn && "ml-9")}>
        <div className="px-3 py-1 rounded-xl bg-muted/20 border border-border/15">
          <p className="text-[11px] text-muted-foreground/40 italic flex items-center gap-1.5">
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Message deleted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex gap-2",
        isOwn ? "justify-end" : "justify-start",
        showSender ? "mt-3 mb-0.5" : "mb-[2px]"
      )}
    >

      {!isOwn && (
        <div className="w-7 shrink-0 self-end">
          {showSender ? (
            <Avatar className="h-7 w-7 border border-border/30 shadow-sm">
              <AvatarImage src={resolveImageUrl(message.sender?.image)} />
              <AvatarFallback className="text-[8px] font-bold bg-gradient-to-br from-blue-100 to-indigo-50 text-blue">
                {getInitials(message.sender?.name)}
              </AvatarFallback>
            </Avatar>
          ) : <div className="w-7" />}
        </div>
      )}

      <div className={cn("max-w-[75%] sm:max-w-[65%] min-w-0 relative flex flex-col", isOwn ? "items-end" : "items-start")}>
        {showSender && !isOwn && (
          <p className="text-[11px] font-bold text-blue mb-1 px-1 ml-1 truncate max-w-full">
            {message.sender?.name}
          </p>
        )}

        {message.replyTo && (
          <button
            type="button"
            onClick={() => {
              const el = document.querySelector<HTMLElement>(`[data-message-id="${message.replyTo!.id}"]`);
              if (!el) {
                toast.info("Original message is not loaded yet");
                return;
              }
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.style.transition = "box-shadow 0.2s ease-out, border-radius 0.2s";
              el.style.boxShadow = "0 0 0 3px rgba(212,165,68,0.5), 0 0 12px rgba(212,165,68,0.2)";
              el.style.borderRadius = "16px";
              setTimeout(() => {
                el.style.transition = "box-shadow 0.8s ease-out, border-radius 0.8s";
                el.style.boxShadow = "";
                el.style.borderRadius = "";
              }, 1200);
            }}
            className={cn(
              "mx-1 mb-0.5 px-2.5 py-1.5 rounded-lg border text-[11px] max-w-full min-w-0 w-full text-left cursor-pointer transition-colors hover:opacity-80",
              isOwn
                ? "bg-gold/5 border-gold/15"
                : "bg-blue/5 border-blue/10"
            )}
          >
            <p className={cn("font-bold truncate", isOwn ? "text-gold" : "text-blue")}>
              {message.replyTo.sender?.name}
            </p>
            {message.replyTo.isDeleted ? (
              <p className="text-muted-foreground/50 truncate italic">Original message was deleted</p>
            ) : (
              <p className="text-muted-foreground truncate">{message.replyTo.content}</p>
            )}
          </button>
        )}

        {isEditing ? (
          <div className="mx-1">
            <div className="rounded-xl border border-gold/40 bg-background overflow-hidden shadow-sm">
              <textarea
                value={editInput}
                onChange={handleEditInputChange}
                onKeyDown={handleEditKeyDown}
                className="w-full bg-transparent text-[14px] resize-none px-3 py-2 focus:outline-none min-h-[40px]"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 mt-1 px-1">
              <button onClick={onCancelEdit} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
              <span className="text-muted-foreground/30">|</span>
              <button onClick={onSaveEdit} className="text-[11px] text-gold font-bold hover:underline">Save</button>
              <span className="text-[10px] text-muted-foreground/30 ml-auto hidden sm:inline">Esc / Enter</span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "relative px-3.5 py-2 shadow-sm max-w-full min-w-0",
              isOwn
                ? "bg-gradient-to-br from-gold to-amber-700 text-white rounded-2xl rounded-br-md"
                : "bg-card border border-border/40 text-foreground rounded-2xl rounded-bl-md"
            )}
          >
            {message.content && (
              <p
                className={cn(
                  "text-[14px] whitespace-pre-wrap break-words leading-[1.55] [overflow-wrap:anywhere]",
                  isOwn ? "text-white" : "text-foreground"
                )}
              >
                {message.content}
              </p>
            )}

            {message.attachments.length > 0 && (
              <div className="mt-1.5 space-y-1.5">
                {message.attachments.map((att) => {
                  const url = resolveFileUrl(att.fileUrl, att.mimeType);
                  return isImageMime(att.mimeType) ? (
                    <a
                      key={att.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden"
                    >
                      <Image
                        src={url}
                        alt={att.fileName}
                        width={280}
                        height={200}
                        unoptimized
                        className="max-w-[280px] max-h-[200px] object-cover rounded-lg"
                      />
                    </a>
                  ) : (() => {
                    const colors = getFileColor(att.fileName);
                    const downloadHref = getAttachmentDownloadHref(att.fileUrl, att.mimeType);
                    const office = isOfficeLikeFileName(att.fileName);
                    return (
                      <div
                        key={att.id}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-2 rounded-lg border max-w-xs",
                          isOwn
                            ? "bg-white/10 border-white/15"
                            : "bg-background border-border/50 shadow-sm"
                        )}
                      >
                        <div
                          className={cn(
                            "h-8 w-8 rounded-md flex flex-col items-center justify-center shrink-0",
                            isOwn ? "bg-white/15" : colors.bg
                          )}
                        >
                          <svg className={cn("h-3.5 w-3.5", isOwn ? "text-white/80" : colors.text)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                          <span
                            className={cn(
                              "text-[6px] font-bold text-white px-1 rounded mt-0.5",
                              isOwn ? "bg-white/30" : colors.badge
                            )}
                          >
                            {getFileExt(att.fileName)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold truncate max-w-[140px] leading-tight">{att.fileName}</p>
                          <p
                            className={cn(
                              "text-[10px]",
                              isOwn ? "text-white/60" : "text-muted-foreground"
                            )}
                          >
                            {formatFileSize(att.fileSize)}
                          </p>
                        </div>
                        {office ? (
                          <div className="flex flex-col gap-1 shrink-0 items-stretch">
                            <a
                              href={downloadHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.fileName}
                              className={cn(
                                "text-[10px] font-semibold px-2 py-1 rounded-md text-center border transition-colors",
                                isOwn
                                  ? "border-white/25 text-white hover:bg-white/15"
                                  : "border-border bg-muted/40 hover:bg-muted/70 text-foreground"
                              )}
                            >
                              Download
                            </a>
                            <button
                              type="button"
                              onClick={() => handleOpenOfficeFile(att.fileUrl, att.mimeType)}
                              className={cn(
                                "text-[10px] font-semibold px-2 py-1 rounded-md text-center border transition-colors",
                                isOwn
                                  ? "border-white/25 text-white hover:bg-white/15"
                                  : "border-border bg-muted/40 hover:bg-muted/70 text-foreground"
                              )}
                            >
                              Open
                            </button>
                          </div>
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "shrink-0 p-1.5 rounded-md transition-colors",
                              isOwn ? "hover:bg-white/15" : "hover:bg-muted/50"
                            )}
                            aria-label="Download or open file"
                          >
                            <svg className={cn("h-4 w-4", isOwn ? "text-white/50" : "text-muted-foreground/50")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                          </a>
                        )}
                      </div>
                    );
                  })();
                })}
              </div>
            )}

            <div
              className={cn(
                "flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1",
                isOwn ? "justify-end" : "justify-start"
              )}
            >
              <span
                className={cn("text-[11px] font-medium", isOwn ? "text-white/80" : "text-muted-foreground")}
                title={formatMessageTimeFull(message.createdAt)}
              >
                {formatMessageTime(message.createdAt)}
              </span>
              {message.isEdited && (
                <span className={cn("text-[11px]", isOwn ? "text-white/60" : "text-muted-foreground/70")}>
                  edited
                </span>
              )}
              {isOwn && <svg className={cn("h-3.5 w-3.5", "text-white/70")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="20 6 9 17 4 12"/><polyline points="20 6 9 17 4 12" transform="translate(4,0)"/></svg>}
              {isOwn &&
                message.content &&
                message.messageType === "text" &&
                channelId > 0 && (
                  <MessageReadReceipts channelId={channelId} messageId={message.id} />
                )}
            </div>
          </div>
        )}

        {reactionEntries.length > 0 && (
          <div
            className={cn(
              "flex flex-wrap gap-1 mt-1 px-1 max-w-full",
              isOwn ? "justify-end" : "justify-start"
            )}
          >
            {reactionEntries.map(([emoji, userIds]) => {
              const reactedByMe = userIds.includes(currentUserId);
              return (
                <ReactionWithWho
                  key={emoji}
                  emoji={emoji}
                  userIds={userIds}
                  reactedByMe={reactedByMe}
                  currentUserId={currentUserId}
                  isOwnBubble={isOwn}
                  profiles={reactionProfiles}
                  onToggle={() => onReact(emoji)}
                />
              );
            })}
          </div>
        )}

        {!isEditing && (
          <div
            className={cn(
              "absolute -top-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-20",
              isOwn ? "left-0" : "right-0"
            )}
          >
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/60 bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  aria-label="Message actions"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align={isOwn ? "start" : "end"}
                className="w-48"
              >
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    <svg className="h-3.5 w-3.5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><line x1="19" y1="5" x2="19" y2="9"/><line x1="17" y1="7" x2="21" y2="7"/></svg>
                    React
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="p-0 border-0 bg-transparent shadow-none">
                    <div className="rounded-md border bg-popover p-1 shadow-md">
                      <EmojiGrid onSelect={handleEmojiSelect} />
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  className="text-xs"
                  onClick={() => {
                    setMenuOpen(false);
                    onReply();
                  }}
                >
                  <svg className="h-3.5 w-3.5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                  Reply
                </DropdownMenuItem>
                {message.content || message.attachments.length > 0 ? (
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => {
                      setMenuOpen(false);
                      setForwardOpen(true);
                    }}
                  >
                    <svg className="h-3.5 w-3.5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
                    Forward
                  </DropdownMenuItem>
                ) : null}
                {message.content ? (
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => {
                      setMenuOpen(false);
                      handleCopy();
                    }}
                  >
                    <svg className="h-3.5 w-3.5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                  </DropdownMenuItem>
                ) : null}
                {isOwn ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={() => {
                        setMenuOpen(false);
                        onStartEdit();
                      }}
                    >
                      <svg className="h-3.5 w-3.5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs text-destructive focus:text-destructive"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                    >
                      <svg className="h-3.5 w-3.5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <ForwardMessageDialog
          open={forwardOpen}
          onOpenChange={setForwardOpen}
          message={message}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
