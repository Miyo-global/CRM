"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "@/components/storage/file-upload";
import { Label } from "@/components/ui/label";
import {
  DOCUMENT_UPLOAD_EXTENSIONS,
  DOCUMENT_UPLOAD_MAX_BYTES,
} from "@/lib/validations/files";

const ACCEPT = DOCUMENT_UPLOAD_EXTENSIONS.join(",");

interface DocumentFileUploadProps {
  folder?: string;
  label?: string;
  onUploaded: (payload: { url: string; key: string; fileName: string }) => void;
  onClear?: () => void;
  className?: string;
}

export function DocumentFileUpload({
  folder = "documents",
  label = "Upload file",
  onUploaded,
  onClear,
  className,
}: DocumentFileUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleComplete = useCallback(
    (url: string, key: string, originalFileName?: string) => {
      const name =
        originalFileName?.trim() || key.split("/").pop() || "document";
      setFileName(name);
      onUploaded({ url, key, fileName: name });
    },
    [onUploaded],
  );

  const handleClear = useCallback(() => {
    setFileName(null);
    onClear?.();
  }, [onClear]);

  return (
    <div className={className}>
      <Label className="text-sm font-medium">{label}</Label>
      <FileUpload
        folder={folder}
        accept={ACCEPT}
        maxSize={DOCUMENT_UPLOAD_MAX_BYTES}
        onUploadComplete={handleComplete}
        className="mt-1.5"
      />
      {fileName ? (
        <p className="text-xs text-muted-foreground mt-2">
          Selected: <span className="text-foreground font-medium">{fileName}</span>
          {onClear ? (
            <button
              type="button"
              className="ml-2 text-primary underline-offset-2 hover:underline"
              onClick={handleClear}
            >
              Clear
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
