"use client";

import { memo, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

interface AttachmentRowProps {
  file: File;
  preview: string | null;
  index: number;
  onRemove: (index: number) => void;
}

export const AttachmentRow = memo(function AttachmentRow({
  file,
  preview,
  index,
  onRemove,
}: AttachmentRowProps) {
  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
      {preview ? (
        <Image
          src={preview}
          alt="Preview"
          width={48}
          height={48}
          unoptimized
          className="h-12 w-12 object-cover rounded"
        />
      ) : file.type === "application/pdf" ? (
        <div className="h-12 w-12 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <FileTextIcon className="h-6 w-6 text-red-500" />
        </div>
      ) : (
        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
          <FileTextIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <span className="text-sm truncate block">{file.name}</span>
        <span className="text-xs text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleRemove}
        aria-label={`Remove ${file.name}`}
      >
        <CloseIcon className="h-4 w-4" />
      </Button>
    </div>
  );
});
