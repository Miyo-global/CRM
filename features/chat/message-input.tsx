"use client";

import { useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
const AtSignIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
);
const FileTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const Loader2Icon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
);
const PaperclipIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
);
const ReplyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
);
const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);
const SmileIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
);
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  formatFileSize,
  getFileColor,
  getFileExt,
  getInitials,
} from "./chat-helpers";
import type { Message } from "./chat-types";
import { EmojiGrid } from "./emoji-grid";

type PendingAttachment = {
  fileName: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
};

type OrgUser = {
  id: string;
  name?: string | null;
  image?: string | null;
  role?: string | null;
};

interface MentionItemProps {
  user: OrgUser;
  idx: number;
  mentionIndex: number;
  onInsert: (name: string) => void;
}

function MentionItem({ user, idx, mentionIndex, onInsert }: MentionItemProps) {
  const handleClick = useCallback(() => onInsert(user.name ?? ""), [user.name, onInsert]);
  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors",
        idx === mentionIndex && "bg-gold/10"
      )}
    >
      <Avatar className="h-6 w-6">
        <AvatarImage src={resolveImageUrl(user.image)} />
        <AvatarFallback className="text-[8px]">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <span className="text-[13px] font-medium">{user.name}</span>
      <span className="text-[11px] text-muted-foreground ml-auto">{user.role}</span>
    </button>
  );
}

interface PendingAttachmentItemProps {
  att: PendingAttachment;
  idx: number;
  onRemove: (idx: number) => void;
}

function PendingAttachmentItem({ att, idx, onRemove }: PendingAttachmentItemProps) {
  const handleRemove = useCallback(() => onRemove(idx), [idx, onRemove]);
  const colors = getFileColor(att.fileName);
  return (
    <div className="relative group flex items-center gap-2.5 bg-background border border-border rounded-xl px-3 py-2 shadow-sm">
      {att.mimeType.startsWith("image/") ? (
        <Image
          src={att.fileUrl}
          alt={att.fileName}
          width={44}
          height={44}
          unoptimized
          className="h-11 w-11 rounded-lg object-cover border border-border/30"
        />
      ) : (
        <div className={cn("h-11 w-11 rounded-lg flex flex-col items-center justify-center relative", colors.bg)}>
          <FileTextIcon className={cn("h-5 w-5", colors.text)} />
          <span className={cn("text-[7px] font-bold text-white px-1 rounded mt-0.5", colors.badge)}>
            {getFileExt(att.fileName)}
          </span>
        </div>
      )}
      <div className="min-w-0 max-w-[140px]">
        <p className="text-[12px] font-medium truncate">{att.fileName}</p>
        <p className="text-[10px] text-muted-foreground">{formatFileSize(att.fileSize)}</p>
      </div>
      <button
        onClick={handleRemove}
        aria-label="Remove attachment"
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

export interface MessageInputProps {

  channelId: number;
  displayName: string;
  channelType: string | undefined;

  messageInput: string;
  setMessageInput: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  replyTo: Message | null;
  setReplyTo: (msg: Message | null) => void;

  editingMessage: Message | null;
  onCancelEdit: () => void;

  pendingAttachments: PendingAttachment[];
  setPendingAttachments: React.Dispatch<React.SetStateAction<PendingAttachment[]>>;
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;

  showEmojiPicker: boolean;
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>;
  emojiRef: React.RefObject<HTMLDivElement | null>;
  insertEmoji: (emoji: string) => void;

  showMentions: boolean;
  setShowMentions: React.Dispatch<React.SetStateAction<boolean>>;
  mentionQuery: string;
  mentionIndex: number;
  setMentionIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredMentions: OrgUser[];
  insertMention: (name: string) => void;

  typingText: string | null;

  sendMessage: { isPending: boolean };
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function MessageInput({
  channelId,
  displayName,
  channelType,
  messageInput,
  setMessageInput,
  inputRef,
  fileInputRef,
  replyTo,
  setReplyTo,
  editingMessage,
  onCancelEdit,
  pendingAttachments,
  setPendingAttachments,
  uploading,
  onFileSelect,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiRef,
  insertEmoji,
  showMentions,
  setShowMentions,
  mentionQuery,
  mentionIndex,
  setMentionIndex,
  filteredMentions,
  insertMention,
  typingText,
  sendMessage,
  onSend,
  onKeyDown,
  onInputChange,
}: MessageInputProps) {
  const isEditing = editingMessage !== null;

  const handleCancelReply = useCallback(() => setReplyTo(null), [setReplyTo]);
  const handleOpenFileInput = useCallback(() => { fileInputRef.current?.click(); }, [fileInputRef]);
  const handleToggleEmoji = useCallback(() => {
    setShowEmojiPicker((p) => !p);
    setShowMentions(false);
  }, [setShowEmojiPicker, setShowMentions]);
  const handleInsertMentionAt = useCallback(() => {
    const el = inputRef.current;
    if (el) {
      const pos = el.selectionStart ?? messageInput.length;
      const newVal = messageInput.slice(0, pos) + "@" + messageInput.slice(pos);
      setMessageInput(newVal);
      setShowMentions(true);
      setShowEmojiPicker(false);
      setTimeout(() => { el.focus(); el.setSelectionRange(pos + 1, pos + 1); }, 0);
    }
  }, [inputRef, messageInput, setMessageInput, setShowMentions, setShowEmojiPicker]);
  const handleRemoveAttachment = useCallback((idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, [setPendingAttachments]);

  return (
    <>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-amber-500/30 overflow-hidden bg-amber-500/5 w-full min-w-0"
          >
            <div className="flex items-center gap-3 px-4 py-2 max-w-[900px] mx-auto w-full min-w-0">
              <div className="w-1 h-9 rounded-full bg-amber-500 shrink-0" />
              <svg className="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-[12px] font-bold text-amber-500 truncate">
                  Editing message — press Esc to cancel
                </p>
                <p className="text-[12px] text-muted-foreground truncate">
                  {editingMessage?.content}
                </p>
              </div>
              <button
                onClick={onCancelEdit}
                className="p-1 hover:bg-muted rounded-md shrink-0"
                aria-label="Cancel edit"
              >
                <XIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {replyTo && !isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/30 overflow-hidden bg-muted/20 w-full min-w-0"
          >
            <div className="flex items-center gap-3 px-4 py-2 max-w-[900px] mx-auto w-full min-w-0">
              <div className="w-1 h-9 rounded-full bg-gold shrink-0" />
              <ReplyIcon className="h-4 w-4 text-gold shrink-0" />
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-[12px] font-bold text-gold truncate">
                  Replying to {replyTo.sender?.name}
                </p>
                <p className="text-[12px] text-muted-foreground truncate">
                  {replyTo.content}
                </p>
              </div>
              <button
                onClick={handleCancelReply}
                className="p-1 hover:bg-muted rounded-md shrink-0"
                aria-label="Cancel reply"
              >
                <XIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-3 sm:px-5 py-2 border-t border-border/40 shrink-0 bg-card/50 relative">
        <div className="max-w-[900px] mx-auto">

          <AnimatePresence>
            {!isEditing && showMentions && filteredMentions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-3 sm:left-6 right-3 sm:right-6 mb-1 z-20"
              >
                <div className="max-w-[800px] mx-auto">
                  <div className="bg-background border border-border/60 rounded-xl shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
                      Members
                    </div>
                    {filteredMentions.slice(0, 8).map((user, idx) => (
                      <MentionItem
                        key={user.id}
                        user={user}
                        idx={idx}
                        mentionIndex={mentionIndex}
                        onInsert={insertMention}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!isEditing && showEmojiPicker && (
              <motion.div
                ref={emojiRef}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-3 sm:left-6 mb-1 z-20"
              >
                <EmojiGrid onSelect={insertEmoji} />
              </motion.div>
            )}
          </AnimatePresence>

          {!isEditing && pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((att, idx) => (
                <PendingAttachmentItem
                  key={att.fileKey}
                  att={att}
                  idx={idx}
                  onRemove={handleRemoveAttachment}
                />
              ))}
              {uploading && (
                <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-lg px-3 py-2">
                  <Loader2Icon className="h-4 w-4 animate-spin text-gold" />
                  <span className="text-[11px] text-muted-foreground">Uploading...</span>
                </div>
              )}
            </div>
          )}

          {!isEditing && typingText && (
            <div className="px-4 pb-1">
              <span className="text-xs text-muted-foreground/70 italic animate-pulse">
                {typingText}
              </span>
            </div>
          )}

          <div
            className={cn(
              "rounded-2xl border border-border bg-background shadow-md transition-all",
              isEditing
                ? "opacity-50 cursor-not-allowed"
                : "focus-within:border-gold/50 focus-within:shadow-lg"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
              onChange={onFileSelect}
              className="hidden"
              aria-label="Upload file"
              disabled={isEditing}
            />
            <textarea
              ref={inputRef}
              value={isEditing ? "" : messageInput}
              onChange={isEditing ? undefined : onInputChange}
              onKeyDown={isEditing ? undefined : onKeyDown}
              readOnly={isEditing}
              placeholder={
                isEditing
                  ? "Finish editing the message above to send a new one..."
                  : `Message ${channelType === "DIRECT" ? displayName : "#" + displayName}...`
              }
              rows={1}
              className={cn(
                "w-full bg-transparent text-[14px] resize-none px-4 pt-3 pb-1 focus:outline-none min-h-[40px] max-h-[160px]",
                isEditing
                  ? "placeholder:text-muted-foreground/40 cursor-not-allowed"
                  : "placeholder:text-muted-foreground/60"
              )}
            />
            <div className="flex items-center justify-between px-3 py-1.5">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleOpenFileInput}
                  disabled={uploading || isEditing}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isEditing
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : uploading
                      ? "text-gold animate-pulse hover:bg-muted/60"
                      : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/60"
                  )}
                  title="Attach file (max 10MB)"
                  aria-label="Attach file"
                >
                  <PaperclipIcon className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={isEditing ? undefined : handleToggleEmoji}
                  disabled={isEditing}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isEditing
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : showEmojiPicker
                      ? "text-gold bg-muted/50 hover:bg-muted/60"
                      : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/60"
                  )}
                  title="Emoji"
                  aria-label="Add emoji"
                >
                  <SmileIcon className="h-[18px] w-[18px]" />
                </button>
                <button
                  onClick={isEditing ? undefined : handleInsertMentionAt}
                  disabled={isEditing}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isEditing
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/60"
                  )}
                  title="Mention someone"
                  aria-label="Mention someone"
                >
                  <AtSignIcon className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
                    Shift+Enter for new line
                  </span>
                )}
                <button
                  onClick={isEditing ? undefined : onSend}
                  disabled={
                    isEditing ||
                    (!messageInput.trim() && pendingAttachments.length === 0) ||
                    sendMessage.isPending
                  }
                  aria-label="Send"
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                    !isEditing && (messageInput.trim() || pendingAttachments.length > 0)
                      ? "bg-gradient-to-r from-gold to-[#d4a544] text-white shadow-md hover:shadow-lg hover:scale-105"
                      : "bg-muted/50 text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  {sendMessage.isPending ? (
                    <Loader2Icon className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <SendIcon className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
