"use client";

import { useState, useRef } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { formatFileSize } from "@/lib/format-utils";
import { validateFileTypeAndSize } from "@/lib/files/expense-file-validation";

interface FileUploadProps {
  onUploadComplete: (url: string, key: string, originalFileName?: string) => void;
  folder?: string;
  maxSize?: number;
  accept?: string;
  allowedMimeTypes?: readonly string[];
  allowedExtensions?: readonly string[];
  formatHint?: string;
  className?: string;
  multiple?: boolean;
}

export function FileUpload({
  onUploadComplete,
  folder = "uploads",
  maxSize = 10 * 1024 * 1024,
  accept,
  allowedMimeTypes,
  allowedExtensions,
  formatHint,
  className,
  multiple = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ url: string; key: string; name: string; size: number }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) =>
    uploadFiles(e.target.files);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const dropped = e.dataTransfer.files;
    uploadFiles(multiple ? dropped : Array.from(dropped).slice(0, 1));
  };

  const uploadFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const fileArray = Array.from(files);
      let uploadedCount = 0;

      for (const file of fileArray) {
        if (allowedMimeTypes && allowedExtensions) {
          const typeError = validateFileTypeAndSize({
            file,
            allowedMimeTypes,
            allowedExtensions,
            maxSizeBytes: maxSize,
          });
          if (typeError) {
            toast.error(
              formatHint
                ? `${file.name}: ${typeError}. Allowed: ${formatHint}`
                : `${file.name}: ${typeError}`
            );
            continue;
          }
        } else if (file.size > maxSize) {
          toast.error(
            `File ${file.name} is too large (max ${maxSize / 1024 / 1024}MB)`
          );
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const response = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          toast.error(`Failed to upload ${file.name}: ${error.error}`);
          continue;
        }

        const result = await response.json();
        const newFile = { url: result.url, key: result.key, name: file.name, size: file.size };

        setUploadedFiles((prev) => [...prev, newFile]);
        onUploadComplete(result.url, result.key, file.name);
        uploadedCount += 1;
      }

      if (uploadedCount > 0) {
        toast.success(`Successfully uploaded ${uploadedCount} file(s)`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to upload file: ${message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border-strong bg-surface-sunken/40 p-6 text-center transition-colors",
          dragOver && "border-primary bg-brand-soft",
        )}
      >
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-soft-foreground">
          <Upload className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm text-muted-foreground">
          Drag and drop {multiple ? "files" : "a file"} here, or
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          loading={uploading}
        >
          <Upload className="size-4" />
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
        {formatHint && <p className="text-xs text-muted-foreground">{formatHint}</p>}
        <Input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept={accept}
          multiple={multiple}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <ul className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <li
              key={file.key || file.url}
              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-soft text-neutral-strong">
                <FileText className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeFile(index)}
                aria-label="Remove file"
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
