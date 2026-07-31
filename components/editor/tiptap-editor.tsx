"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TiptapToolbar } from "./tiptap-toolbar";
import { useEffect, useRef, useCallback } from "react";

interface TiptapEditorProps {
  content?: unknown;
  onChange?: (json: unknown) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  editable = true,
}: TiptapEditorProps) {
  const hasInitialized = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
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
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-4 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && content && !hasInitialized.current) {
      editor.commands.setContent(content as Record<string, unknown>);
      hasInitialized.current = true;
    }
  }, [editor, content]);

  return (
    <div className="rounded-md border bg-background">
      {editable && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
