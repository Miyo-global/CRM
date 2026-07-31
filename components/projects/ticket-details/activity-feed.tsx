"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Send, Loader2, MessageSquare, Pencil, Trash2, Check, X, Paperclip, FileText, FileSpreadsheet, File } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import {
  useAddComment,
  useUpdateTicketComment,
  useDeleteTicketComment,
} from "@/lib/api/hooks/projects";
import { isExpenseAdmin } from "@/lib/auth/role-guards";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDistanceToNow } from "date-fns";
import type { TicketComment, TicketUser, CommentImage } from "@/types/projects";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  ticketId: number;
  projectId?: number;
  comments: TicketComment[];
}

const COMMENT_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function resolveAttachmentUrl(att: CommentImage): string {
  const key = att.key || (att.url.startsWith("http") ? (() => { try { return new URL(att.url).pathname.replace(/^\//, ""); } catch { return att.url; } })() : att.url);
  if (!key) return att.url;
  if (att.mimeType && !att.mimeType.startsWith("image/")) {
    return `/api/storage/download?key=${encodeURIComponent(key)}&attachment=1`;
  }
  return `/api/storage/image?key=${encodeURIComponent(key)}`;
}

async function uploadCommentFile(file: File): Promise<CommentImage> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "ticket-comments");
  const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Upload failed");
  }
  const data = await res.json();
  return { url: data.url, key: data.key, fileName: file.name, mimeType: file.type };
}

function isImageMime(mimeType?: string, fileName?: string) {
  if (mimeType) return mimeType.startsWith("image/");
  const ext = fileName?.split(".").pop()?.toLowerCase();
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" || ext === "webp";
}

function AttachmentIcon({ mimeType, className }: { mimeType?: string; className?: string }) {
  if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) return <FileSpreadsheet className={className} />;
  if (mimeType?.includes("pdf") || mimeType?.includes("word") || mimeType?.includes("document")) return <FileText className={className} />;
  return <File className={className} />;
}

export function ActivityFeed({ ticketId, projectId, comments }: ActivityFeedProps) {
  const { data: session } = useSession();
  const [newComment, setNewComment] = useState("");
  const [pendingImages, setPendingImages] = useState<CommentImage[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addComment = useAddComment({
    onSuccess: () => {
      setNewComment("");
      setPendingImages([]);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => COMMENT_ACCEPT.includes(f.type));
    if (!validFiles.length) return;
    if (pendingImages.length + validFiles.length > 10) {
      toast.error("Maximum 10 attachments per comment");
      return;
    }
    setUploadingCount((n) => n + validFiles.length);
    await Promise.all(
      validFiles.map(async (file) => {
        try {
          const attachment = await uploadCommentFile(file);
          setPendingImages((prev) => [...prev, attachment]);
        } catch (e) {
          toast.error(`Failed to upload ${file.name}: ${getErrorMessage(e)}`);
        } finally {
          setUploadingCount((n) => n - 1);
        }
      })
    );
  }, [pendingImages.length]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean) as File[];
    if (files.length) {
      e.preventDefault();
      handleFiles(files);
    }
  }, [handleFiles]);

  const removeImage = useCallback((key: string) => {
    setPendingImages((prev) => prev.filter((img) => img.key !== key));
  }, []);

  const handleSubmit = useCallback(() => {
    const content = newComment.trim();
    if ((!content && pendingImages.length === 0) || addComment.isPending || uploadingCount > 0) return;
    if (projectId == null || projectId <= 0) {
      toast.error("Missing project");
      return;
    }
    const u = session?.user;
    const actor =
      u?.id != null
        ? {
            id: u.id,
            name: u.name ?? null,
            firstName: u.name?.trim().split(/\s+/)[0] ?? null,
            lastName: u.name?.trim().split(/\s+/).slice(1).join(" ") || null,
            email: (u as { email?: string | null }).email ?? null,
            image: u.image ?? null,
          }
        : undefined;
    addComment.mutate({
      ticketId,
      projectId,
      content: content || " ",
      images: pendingImages.length ? pendingImages : undefined,
      actor,
    });
  }, [newComment, pendingImages, ticketId, projectId, addComment, session?.user, uploadingCount]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const canSend = (newComment.trim().length > 0 || pendingImages.length > 0) && uploadingCount === 0;
  const currentUserId = session?.user?.id;
  const canModerate = isExpenseAdmin(session?.user?.role);

  return (
    <div className="space-y-4">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        Activity
        {comments.length > 0 && (
          <span className="text-muted-foreground/70">({comments.length})</span>
        )}
      </h4>

      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Write a comment… (Ctrl+Enter to send, paste images directly)"
          className="min-h-[80px] text-sm resize-none"
        />

        {pendingImages.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 rounded-md border bg-muted/30">
            {pendingImages.map((att) => (
              <div key={att.key} className="relative group">
                {isImageMime(att.mimeType, att.fileName) ? (
                  <img
                    src={resolveAttachmentUrl(att)}
                    alt={att.fileName}
                    className="h-16 w-16 object-cover rounded border"
                  />
                ) : (
                  <div className="h-16 w-40 flex items-center gap-2 rounded border bg-background px-3">
                    <AttachmentIcon mimeType={att.mimeType} className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <span className="text-[11px] truncate text-foreground/80">{att.fileName}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(att.key)}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept={COMMENT_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCount > 0}
              title="Attach images, PDFs, Word docs or spreadsheets"
            >
              {uploadingCount > 0 ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
            </Button>
            {uploadingCount > 0 && (
              <span className="text-[11px] text-muted-foreground">Uploading…</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSend || addComment.isPending}
            aria-busy={addComment.isPending}
          >
            {addComment.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1" />
                Comment
              </>
            )}
          </Button>
        </div>
      </div>

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments
            .sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime()
            )
            .map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                ticketId={ticketId}
                projectId={projectId}
                currentUserId={currentUserId}
                canModerate={canModerate}
              />
            ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No comments yet. Be the first to comment.
        </p>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  ticketId,
  projectId,
  currentUserId,
  canModerate,
}: {
  comment: TicketComment;
  ticketId: number;
  projectId?: number;
  currentUserId?: string;
  canModerate: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const user = comment.user as TicketUser | undefined;
  const timeAgo = comment.createdAt
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
    : "";

  const commentAuthorId = String(
    comment.userId ?? (comment.user as TicketUser | undefined)?.id ?? ""
  );
  const isOwner =
    !!currentUserId &&
    !!commentAuthorId &&
    commentAuthorId === String(currentUserId);
  const showActions = isOwner || canModerate;

  useEffect(() => {
    if (!editing) setEditContent(comment.content);
  }, [comment.content, editing]);

  const updateComment = useUpdateTicketComment({
    onSuccess: () => {
      setEditing(false);
      toast.success("Comment updated");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteComment = useDeleteTicketComment({
    onSuccess: () => {
      setDeleteOpen(false);
      toast.success("Comment deleted");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed) {
      toast.error("Comment cannot be empty");
      return;
    }
    updateComment.mutate({
      ticketId,
      projectId,
      commentId: comment.id,
      content: trimmed,
    });
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setEditing(false);
  };

  const images = comment.images ?? [];
  const displayContent = comment.content.trim();

  return (
    <>
      <div className="flex gap-2.5 group">
        <Avatar className="h-7 w-7 shrink-0 mt-0.5">
          <AvatarImage src={resolveImageUrl(user?.image)} />
          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
            {showActions && !editing && (
              <span className="ml-auto flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Edit comment"
                  onClick={() => {
                    setEditContent(comment.content);
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  aria-label="Delete comment"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </span>
            )}
          </div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[72px] text-sm resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={updateComment.isPending}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updateComment.isPending}
                >
                  {updateComment.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-0.5 space-y-2">
              {displayContent && displayContent !== " " && (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                  {displayContent}
                </p>
              )}
              {images.length > 0 && (
                <div className={cn("flex flex-wrap gap-2", displayContent && displayContent !== " " && "mt-2")}>
                  {images.map((att) =>
                    isImageMime(att.mimeType, att.fileName) ? (
                      <button
                        key={att.key}
                        type="button"
                        onClick={() => setLightboxSrc(resolveAttachmentUrl(att))}
                        className="block rounded overflow-hidden border hover:opacity-90 transition-opacity"
                        title={att.fileName}
                      >
                        <img
                          src={resolveAttachmentUrl(att)}
                          alt={att.fileName}
                          className="h-24 w-auto max-w-[200px] object-cover"
                        />
                      </button>
                    ) : (
                      <a
                        key={att.key}
                        href={resolveAttachmentUrl(att)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded border bg-muted/40 hover:bg-muted/70 transition-colors px-3 py-2 text-[12px] text-foreground/80 max-w-[220px]"
                        title={att.fileName}
                      >
                        <AttachmentIcon mimeType={att.mimeType} className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{att.fileName}</span>
                      </a>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={lightboxSrc}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The comment will be removed from the ticket activity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteComment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                deleteComment.mutate({
                  ticketId,
                  projectId,
                  commentId: comment.id,
                });
              }}
              disabled={deleteComment.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
