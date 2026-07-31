"use client";

import { memo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { AttachmentRow } from "./attachment-row";

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

const ACCEPT_ATTACHMENTS =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf";
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

interface AttachmentUploaderProps<TFormValues extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<TFormValues, any, any>;
  fieldName: Path<TFormValues>;
  files: File[];
  previews: (string | null)[];
  uploading: boolean;
  onFilesChange: (files: File[], previews: (string | null)[]) => void;
  onRemove: (index: number) => void;
}

export const AttachmentUploader = memo(function AttachmentUploader<
  TFormValues extends FieldValues,
>({
  form,
  fieldName,
  files,
  previews,
  uploading,
  onFilesChange,
  onRemove,
}: AttachmentUploaderProps<TFormValues>) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputFiles = e.target.files;
      if (!inputFiles || inputFiles.length === 0) return;
      const allowed = ACCEPT_ATTACHMENTS.split(",").map((t) => t.trim());
      const newFiles: File[] = [];
      const newPreviews: (string | null)[] = [];

      Array.from(inputFiles).forEach((file) => {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          toast.error(`${file.name} is too large (max 10MB)`);
          return;
        }
        if (!allowed.includes(file.type)) {
          toast.error(
            `${file.name}: Only images (JPEG, PNG, GIF, WebP) or PDF allowed`,
          );
          return;
        }
        newFiles.push(file);
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            onFilesChange(
              [...files, ...newFiles],
              (() => {
                const updated = [...previews, ...newPreviews];
                const idx = files.length + newFiles.indexOf(file);
                updated[idx] = reader.result as string;
                return updated;
              })(),
            );
          };
          reader.readAsDataURL(file);
          newPreviews.push(null);
        } else {
          newPreviews.push(null);
        }
      });

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles], [...previews, ...newPreviews]);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [files, previews, onFilesChange],
  );

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={() => (
        <FormItem>
          <FormLabel>Attachments (images or PDF)</FormLabel>
          <FormControl>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClickUpload}
                  disabled={uploading}
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload files"}
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPT_ATTACHMENTS}
                  onChange={handleAttachmentChange}
                  multiple
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <AttachmentRow
                      key={`${file.name}-${index}`}
                      file={file}
                      preview={previews[index] ?? null}
                      index={index}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Images (JPEG, PNG, GIF, WebP) or PDF, max 10MB each. Multiple
                files allowed.
              </p>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}) as <TFormValues extends FieldValues>(
  props: AttachmentUploaderProps<TFormValues>,
) => React.ReactElement;
