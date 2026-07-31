"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRichDocument, useUpdateRichDocument, usePublishRichDocument } from "@/lib/api/hooks/hr";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Globe, GlobeLock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DocumentEditorPage() {
  const params = useParams<{ documentId: string }>();
  const router = useRouter();
  const documentId = Number(params.documentId);

  const { data: doc, isLoading } = useRichDocument(documentId);
  const updateDoc = useUpdateRichDocument();
  const publishDoc = usePublishRichDocument();

  const [title, setTitle] = useState("");
  const [contentJson, setContentJson] = useState<unknown>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContentJson(doc.contentJson);
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
    setIsDirty(true);
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
      <PageWrapper title="Document Not Found" subtitle="The requested document could not be found.">
        <Button asChild><Link href="/hr/documents">Back to Documents</Link></Button>
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Document Editor" subtitle="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!doc) {
    return (
      <PageWrapper title="Document Not Found" subtitle="The requested document could not be found.">
        <Button asChild><Link href="/hr/documents">Back to Documents</Link></Button>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Document Editor"
      subtitle={doc.templateType ? `Template: ${doc.templateType}` : undefined}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/hr/documents"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link>
          </Button>
          {isDirty && (
            <Badge variant="outline" className="text-amber-600">Unsaved</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handlePublish} disabled={publishDoc.isPending}>
            {doc.isPublished ? <GlobeLock className="mr-1 h-4 w-4" /> : <Globe className="mr-1 h-4 w-4" />}
            {doc.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty || !title.trim() || updateDoc.isPending}>
            <Save className="mr-1 h-4 w-4" />
            {updateDoc.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-w-4xl mx-auto">
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Document title"
          className="text-lg font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0"
        />
        <TiptapEditor
          content={contentJson}
          onChange={handleContentChange}
          placeholder="Start writing your document..."
        />
      </div>
    </PageWrapper>
  );
}
