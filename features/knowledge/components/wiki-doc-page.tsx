"use client";

import { Save, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteKbPage, useKbPage, useUpdateKbPage, type KbPage } from "@/lib/api/hooks/knowledge";
import { getErrorMessage } from "@/lib/get-error-message";
import { extractContentText, toTiptapDoc } from "@/lib/knowledge/content";
import { KB_TRASH, KNOWLEDGE_BASE } from "@/lib/knowledge/routes";

import { KbPageNotFound } from "./kb-page-not-found";

// The editor is the heaviest chunk here; the title paints without it.
const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-lg" /> },
);

/** R3-PRJ-05: one wiki page — read it, edit its title and body, move it to Trash. */
export function WikiDocPage({ pageId }: { pageId: number }) {
  const { data, isError, isLoading } = useKbPage(pageId);

  if (isError) return <KbPageNotFound />;
  if (isLoading || !data) return <Skeleton className="m-6 h-96" />;

  // Keyed on the revision so a refetch after save starts from the stored page.
  return (
    <WikiDocEditor
      key={`${data.page.id}:${data.page.contentRevision ?? 0}`}
      page={data.page}
      canEdit={data.capabilities.edit}
      canDelete={data.capabilities.manage}
    />
  );
}

function WikiDocEditor({ page, canEdit, canDelete }: { page: KbPage; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const update = useUpdateKbPage(page.id);
  const remove = useDeleteKbPage();
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState<unknown>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = title !== page.title || content !== undefined;
  // "New page" creates the page straight away; a page nobody wrote anything in
  // gets a one-click way back out instead of lingering as "Untitled".
  const isBlankDraft =
    canDelete &&
    content === undefined &&
    (!title.trim() || title.trim() === "Untitled") &&
    !extractContentText(page.content).trim();

  function save() {
    update.mutate(
      {
        title: title.trim(),
        ...(content !== undefined && { content }),
        ...(page.contentRevision !== undefined && { expectedRevision: page.contentRevision }),
      },
      {
        onSuccess: () => toast.success("Page saved"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function discardDraft() {
    remove.mutate(page.id, {
      onSuccess: () => {
        toast.success("Draft discarded");
        router.push(KNOWLEDGE_BASE);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function moveToTrash() {
    remove.mutate(page.id, {
      onSuccess: () => {
        toast.success("Page moved to Trash");
        router.push(KB_TRASH);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Page title"
          placeholder="Untitled"
          value={title}
          maxLength={500}
          readOnly={!canEdit}
          onChange={(event) => setTitle(event.target.value)}
          className="h-auto border-none px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
        />
        {canEdit ? (
          <Button size="sm" onClick={save} disabled={!dirty || update.isPending}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        ) : null}
        {isBlankDraft ? (
          <Button size="sm" variant="ghost" onClick={discardDraft} disabled={remove.isPending}>
            Discard
          </Button>
        ) : canDelete ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmDelete(true)}
            disabled={remove.isPending}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        ) : null}
      </div>

      <TiptapEditor
        content={toTiptapDoc(page.content)}
        editable={canEdit}
        onChange={setContent}
        placeholder="Start writing…"
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Move this page to Trash?"
        description="Its sub-pages go with it. You can restore them from Trash."
        confirmLabel="Move to Trash"
        destructive
        onConfirm={moveToTrash}
      />
    </div>
  );
}
