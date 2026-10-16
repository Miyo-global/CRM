"use client";

import { useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, MessageSquare, X, Paperclip } from "lucide-react";
import { useAddComment } from "@/lib/api/hooks/projects";
import { isExpenseAdmin } from "@/lib/auth/role-guards";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TicketComment, CommentImage } from "@/types/projects";
import { MentionTextarea, type MentionPerson } from "@/features/projects/comments/mention-textarea";
import { CommentItem } from "./comment-item";
import { AttachmentIcon, COMMENT_ACCEPT, isImageMime, resolveAttachmentUrl, uploadCommentFile } from "./comment-files";

interface ActivityFeedProps {
  ticketId: number;
  projectId: number;
  comments: TicketComment[];
  people: MentionPerson[];
  canComment: boolean;
}

export function ActivityFeed({ ticketId, projectId, comments, people, canComment }: ActivityFeedProps) {
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
    const all = Array.from(files);
    const validFiles = all.filter((f) => COMMENT_ACCEPT.includes(f.type));
    // A file of an unsupported type used to be dropped without a word, so the
    // comment posted with no attachment (QA-0056).
    const skipped = all.filter((f) => !validFiles.includes(f));
    if (skipped.length > 0) {
      toast.error(
        skipped.length === 1
          ? `${skipped[0].name} cannot be attached: unsupported file type.`
          : `${skipped.length} files cannot be attached: unsupported file types.`,
      );
    }
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
      content,
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
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
        Comments
        {comments.length > 0 && (
          <span className="tabular-nums text-subtle-foreground">({comments.length})</span>
        )}
      </h2>

      {canComment && (
      <div className="space-y-2">
        <MentionTextarea
          value={newComment}
          onValueChange={setNewComment}
          people={people}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          aria-label="Write a comment"
          placeholder="Write a comment. Type @ to mention someone, Ctrl+Enter to send."
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
                    <span className="text-2xs truncate text-foreground/80">{att.fileName}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(att.key)}
                  aria-label={`Remove ${att.fileName}`}
                  className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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
              className="size-10 px-2 text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCount > 0}
              aria-label="Attach files"
              title="Attach images, PDFs, Word docs or spreadsheets"
            >
              {uploadingCount > 0 ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
            </Button>
            {uploadingCount > 0 && (
              <span className="text-2xs text-muted-foreground">Uploading…</span>
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
      )}

      {comments.length > 0 && (
        <ol className="relative space-y-5 before:absolute before:top-3.5 before:bottom-3.5 before:left-3.5 before:w-px before:-translate-x-1/2 before:bg-border">
          {[...comments]
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
                canReact={canComment}
              />
            ))}
        </ol>
      )}

      {comments.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border py-8 text-center">
          <MessageSquare className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground">
            {canComment ? "Start the conversation, or mention a teammate with @." : "Comments from the team show up here."}
          </p>
        </div>
      )}
    </div>
  );
}
