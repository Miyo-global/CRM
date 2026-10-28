"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TiptapToolbar } from "./tiptap-toolbar";
import { useEffect, useRef } from "react";

interface TiptapEditorProps {
  content?: unknown;
  onChange?: (json: unknown) => void;
  placeholder?: string;
  editable?: boolean;
  /** Document-editor layout (§8.6): sticky toolbar over a sunken canvas with a centered A4 sheet. */
  canvas?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  editable = true,
  canvas = false,
}: TiptapEditorProps) {
  const hasInitialized = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-brand-text underline" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
    ],
    content: content as Record<string, unknown> | undefined,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: canvas
          ? "tiptap min-h-[60vh] px-6 py-8 focus:outline-none sm:px-16 sm:py-14"
          : "tiptap min-h-[300px] p-4 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && content && !hasInitialized.current) {
      editor.commands.setContent(content as Record<string, unknown>);
      hasInitialized.current = true;
    }
  }, [editor, content]);

  if (canvas) {
    return (
      <div className="rounded-lg border border-border bg-surface-sunken">
        {editable && (
          <div className="sticky top-[var(--page-sticky-top,0px)] z-sticky overflow-hidden rounded-t-lg bg-background">
            <TiptapToolbar editor={editor} />
          </div>
        )}
        <div className="overflow-x-auto p-3 sm:p-8">
          <div className="mx-auto w-full max-w-[816px] rounded-xs bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      {editable && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
