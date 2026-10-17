"use client";

import { useState, useEffect } from "react";
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
import { Loader2, MessageSquare, Pencil, Trash2, Check, X } from "lucide-react";
import { resolveImageUrl, cn } from "@/lib/utils";
import { useUpdateTicketComment, useDeleteTicketComment, useRestoreComment } from "@/lib/api/hooks/projects";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { format, formatDistanceToNow } from "date-fns";
import { parseDbTimestamp } from "@/lib/date-utils";
import type { TicketComment, TicketUser } from "@/types/projects";
import { CommentContent } from "@/features/projects/comments/comment-content";
import { ReactionBar } from "@/features/projects/comments/reaction-bar";
import { AttachmentIcon, isImageMime, resolveAttachmentUrl } from "./comment-files";

export function CommentItem({
  comment,
  ticketId,
  projectId,
  currentUserId,
  canModerate,
  canReact,
}: {
  comment: TicketComment;
  ticketId: number;
  projectId: number;
  currentUserId?: string;
  canModerate: boolean;
  canReact: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const restoreComment = useRestoreComment(projectId, ticketId);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const user = comment.user as TicketUser | undefined;
  const createdAt = comment.createdAt ? parseDbTimestamp(comment.createdAt) : null;
  const timeAgo = createdAt
    ? formatDistanceToNow(createdAt, { addSuffix: true })
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
      toast.success("Deleted the comment", {
        action: { label: "Undo", onClick: () => restoreComment.mutate({ commentId: comment.id }) },
      });
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
    <li className="relative flex gap-3 group">
        <Avatar className="relative size-7 shrink-0 ring-4 ring-surface-raised">
          <AvatarImage src={resolveImageUrl(user?.image)} />
          <AvatarFallback className="bg-brand-soft text-brand-text">
            <MessageSquare className="size-3.5" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
            <span className="text-sm font-semibold text-foreground">
              {user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Former member"}
            </span>
            {createdAt && (
              <time
                dateTime={createdAt.toISOString()}
                title={format(createdAt, "PPpp")}
                className="text-xs text-muted-foreground"
              >
                {timeAgo}
              </time>
            )}
            {showActions && !editing && (
              <span className="ml-auto flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-10 sm:size-7"
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
                  className="size-10 text-destructive hover:text-destructive sm:size-7"
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
              {displayContent && <CommentContent content={displayContent} />}
              {images.length > 0 && (
                <div className={cn("flex flex-wrap gap-2", displayContent && "mt-2")}>
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
                        className="flex items-center gap-2 rounded border bg-muted/40 hover:bg-muted/70 transition-colors px-3 py-2 text-xs text-foreground/80 max-w-[220px]"
                        title={att.fileName}
                      >
                        <AttachmentIcon mimeType={att.mimeType} className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{att.fileName}</span>
                      </a>
                    )
                  )}
                </div>
              )}
              <ReactionBar
                projectId={projectId}
                ticketId={ticketId}
                commentId={comment.id}
                reactions={comment.reactions ?? []}
                currentUserId={currentUserId}
                disabled={!canReact}
              />
            </div>
          )}
        </div>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-popover flex items-center justify-center bg-overlay backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 size-10 rounded-full bg-card hover:bg-accent flex items-center justify-center text-foreground"
            onClick={() => setLightboxSrc(null)}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={lightboxSrc}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              The comment and its replies leave the ticket. You can undo right after deleting.
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
    </li>
  );
}
