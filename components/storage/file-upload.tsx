"use client";

import { useState, useRef } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Upload, X, File } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
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
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ url: string; key: string; name: string }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
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
        const newFile = { url: result.url, key: result.key, name: file.name };

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
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
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
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={file.key || file.url}
              className="flex items-center justify-between p-2 border rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <File className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
