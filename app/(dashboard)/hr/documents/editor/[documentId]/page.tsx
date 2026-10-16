"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRichDocument, useUpdateRichDocument, usePublishRichDocument } from "@/lib/api/hooks/hr";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Globe, GlobeLock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DocumentEditorPage() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();
  const documentId = Number(params.documentId);

  const { data: doc, isLoading, isError, error, refetch } = useRichDocument(documentId);
  const updateDoc = useUpdateRichDocument();
  const publishDoc = usePublishRichDocument();

  const [title, setTitle] = useState("");
  const [contentJson, setContentJson] = useState<unknown>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * The content as last loaded or saved.
   *
   * The editor emits onChange while it hydrates, which marked the document
   * dirty the moment it opened (QA-0049). A change that matches this baseline
   * is hydration, not an edit.
   */
  const baselineRef = useRef<string | null>(null);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContentJson(doc.contentJson);
      baselineRef.current = JSON.stringify(doc.contentJson ?? null);
    }
  }, [doc]);

  const handleSave = useCallback(() => {
    if (!isDirty) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length > 200) {
      toast.error("Title is required and must be 200 characters or fewer");
      return;
    }
    updateDoc.mutate(
      { id: documentId, title: trimmedTitle, contentJson },
      {
        onSuccess: () => {
          baselineRef.current = JSON.stringify(contentJson ?? null);
          setIsDirty(false);
          toast.success("Document saved");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [documentId, title, contentJson, isDirty, updateDoc]);

  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave();
    }, 30_000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, handleSave]);

  const handleContentChange = useCallback((json: unknown) => {
    setContentJson(json);
    if (JSON.stringify(json ?? null) !== baselineRef.current) setIsDirty(true);
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsDirty(true);
  }, []);

  const handlePublish = useCallback(() => {
    publishDoc.mutate(documentId, {
      onSuccess: () => toast.success(doc?.isPublished ? "Document unpublished" : "Document published"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [documentId, publishDoc, doc?.isPublished]);

  if (Number.isNaN(documentId)) {
    return (
      <PageWrapper title="Document not found">
        <EmptyState
          title="Document not found"
          description="The requested document could not be found."
          action={{ label: "Back to Documents", href: "/hr/documents" }}
        />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Document editor">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-150 w-full rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Document editor">
        <QueryErrorState title="Couldn't load document" error={error} onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

  if (!doc) {
    return (
      <PageWrapper title="Document not found">
        <EmptyState
          title="Document not found"
          description="The requested document could not be found."
          action={{ label: "Back to Documents", href: "/hr/documents" }}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Document editor"
      subtitle={doc.templateType ? `Template: ${doc.templateType}` : undefined}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/documents"><ArrowLeft className="size-4" aria-hidden />Back</Link>
          </Button>
          {isDirty && (
            <StatusPill tone="warning" dot>Unsaved</StatusPill>
          )}
          <Button variant="outline" size="sm" onClick={handlePublish} loading={publishDoc.isPending}>
            {publishDoc.isPending ? null : doc.isPublished ? <GlobeLock className="size-4" aria-hidden /> : <Globe className="size-4" aria-hidden />}
            {doc.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty || !title.trim()} loading={updateDoc.isPending}>
            {!updateDoc.isPending && <Save className="size-4" aria-hidden />}
            {updateDoc.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Document title"
          aria-label="Document title"
          className="h-11 rounded-none border-0 border-b border-border bg-transparent px-0 font-display text-xl font-bold shadow-none focus-visible:border-primary focus-visible:ring-0"
        />
        <TiptapEditor
          canvas
          content={contentJson}
          onChange={handleContentChange}
          placeholder="Start writing your document..."
        />
      </div>
    </PageWrapper>
  );
}
